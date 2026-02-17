"""
Mr. Dollars — Time Loom Integration Client

Communicates with the Time Loom scheduling platform to fetch
appointment, revenue, and client data. Normalizes responses
into TimeLoomSnapshot for the analytics engine.

The Time Loom section is expected to expose:
- /api/appointments     — appointment records with status
- /api/revenue          — revenue breakdown by period
- /api/clients          — client activity and retention data
- /api/schedule         — availability and capacity data

This client handles authentication, pagination, and error recovery.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from mr_dollars.engine.models import TimeLoomSnapshot

logger = logging.getLogger("mr_dollars.timeloom")


@dataclass
class TimeLoomConfig:
    """Connection configuration for the Time Loom platform."""

    base_url: str = "http://localhost:8100"
    api_prefix: str = "/api/v1/timeloom"
    api_key: Optional[str] = None
    timeout_seconds: int = 30
    retry_count: int = 3

    @property
    def appointments_url(self) -> str:
        return f"{self.base_url}{self.api_prefix}/appointments"

    @property
    def revenue_url(self) -> str:
        return f"{self.base_url}{self.api_prefix}/revenue"

    @property
    def clients_url(self) -> str:
        return f"{self.base_url}{self.api_prefix}/clients"

    @property
    def schedule_url(self) -> str:
        return f"{self.base_url}{self.api_prefix}/schedule"

    @property
    def snapshot_url(self) -> str:
        return f"{self.base_url}{self.api_prefix}/snapshot"


class TimeLoomClient:
    """
    Client for the Time Loom scheduling platform.

    Fetches data from the Time Loom section and normalizes it
    into TimeLoomSnapshot objects for the Mr. Dollars engine.

    Supports two modes:
    1. Direct snapshot endpoint (if Time Loom exposes aggregated data)
    2. Assembled snapshot (fetches individual endpoints and combines)
    """

    def __init__(self, config: Optional[TimeLoomConfig] = None):
        self.config = config or TimeLoomConfig()
        self._http_client = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MrDollars/0.1",
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    async def _request(self, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make an authenticated request to Time Loom with retry logic."""
        import httpx

        for attempt in range(self.config.retry_count):
            try:
                async with httpx.AsyncClient(
                    timeout=self.config.timeout_seconds
                ) as client:
                    response = await client.get(
                        url,
                        headers=self._get_headers(),
                        params=params or {},
                    )
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as e:
                logger.warning(
                    "Time Loom HTTP error (attempt %d/%d): %s",
                    attempt + 1,
                    self.config.retry_count,
                    e,
                )
                if attempt == self.config.retry_count - 1:
                    raise
            except httpx.ConnectError as e:
                logger.warning(
                    "Time Loom connection error (attempt %d/%d): %s",
                    attempt + 1,
                    self.config.retry_count,
                    e,
                )
                if attempt == self.config.retry_count - 1:
                    raise

        return {}

    async def fetch_snapshot(
        self, period_start: date, period_end: date
    ) -> TimeLoomSnapshot:
        """
        Fetch a complete operational snapshot from Time Loom.
        Tries the aggregated snapshot endpoint first; falls back
        to assembling from individual endpoints.
        """
        params = {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
        }

        try:
            data = await self._request(self.config.snapshot_url, params)
            return self._parse_snapshot(data, period_start, period_end)
        except Exception:
            logger.info(
                "Snapshot endpoint unavailable; assembling from components."
            )
            return await self._assemble_snapshot(period_start, period_end)

    async def _assemble_snapshot(
        self, period_start: date, period_end: date
    ) -> TimeLoomSnapshot:
        """
        Build a snapshot by fetching each Time Loom section individually
        and combining the results.
        """
        params = {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
        }

        appointments_data = await self._request(
            self.config.appointments_url, params
        )
        revenue_data = await self._request(self.config.revenue_url, params)
        clients_data = await self._request(self.config.clients_url, params)
        schedule_data = await self._request(self.config.schedule_url, params)

        return self._combine_data(
            period_start,
            period_end,
            appointments_data,
            revenue_data,
            clients_data,
            schedule_data,
        )

    def _parse_snapshot(
        self, data: Dict[str, Any], period_start: date, period_end: date
    ) -> TimeLoomSnapshot:
        """Parse aggregated snapshot response from Time Loom."""
        appts = data.get("appointments", {})
        rev = data.get("revenue", {})
        clients = data.get("clients", {})
        schedule = data.get("schedule", {})
        costs = data.get("costs", {})

        return TimeLoomSnapshot(
            period_start=period_start,
            period_end=period_end,
            appointments_total=appts.get("total", 0),
            appointments_completed=appts.get("completed", 0),
            appointments_canceled=appts.get("canceled", 0),
            appointments_no_show=appts.get("no_show", 0),
            gross_revenue=rev.get("gross", 0.0),
            net_revenue=rev.get("net", 0.0),
            tips=rev.get("tips", 0.0),
            available_hours=schedule.get("available_hours", 0.0),
            booked_hours=schedule.get("booked_hours", 0.0),
            clients_total=clients.get("total", 0),
            clients_returning=clients.get("returning", 0),
            rebooks_within_30d=clients.get("rebooks_30d", 0),
            revenue_by_service=rev.get("by_service_revenue", {}),
            count_by_service=rev.get("by_service_count", {}),
            variable_costs=costs.get("variable", 0.0),
            fixed_costs=costs.get("fixed", 0.0),
            obligations_next_30d=costs.get("obligations_30d", 0.0),
        )

    def _combine_data(
        self,
        period_start: date,
        period_end: date,
        appointments_data: Dict,
        revenue_data: Dict,
        clients_data: Dict,
        schedule_data: Dict,
    ) -> TimeLoomSnapshot:
        """Combine individual endpoint responses into a snapshot."""
        return TimeLoomSnapshot(
            period_start=period_start,
            period_end=period_end,
            appointments_total=appointments_data.get("total", 0),
            appointments_completed=appointments_data.get("completed", 0),
            appointments_canceled=appointments_data.get("canceled", 0),
            appointments_no_show=appointments_data.get("no_show", 0),
            gross_revenue=revenue_data.get("gross", 0.0),
            net_revenue=revenue_data.get("net", 0.0),
            tips=revenue_data.get("tips", 0.0),
            available_hours=schedule_data.get("available_hours", 0.0),
            booked_hours=schedule_data.get("booked_hours", 0.0),
            clients_total=clients_data.get("total", 0),
            clients_returning=clients_data.get("returning", 0),
            rebooks_within_30d=clients_data.get("rebooks_30d", 0),
            revenue_by_service=revenue_data.get("by_service_revenue", {}),
            count_by_service=revenue_data.get("by_service_count", {}),
            variable_costs=revenue_data.get("variable_costs", 0.0),
            fixed_costs=revenue_data.get("fixed_costs", 0.0),
            obligations_next_30d=revenue_data.get("obligations_30d", 0.0),
        )

    async def push_report_to_loom(
        self, report_payload: Dict[str, Any]
    ) -> bool:
        """
        Push a Mr. Dollars report back to Time Loom for display
        in the scheduling platform's dashboard.
        """
        import httpx

        url = f"{self.config.base_url}{self.config.api_prefix}/reports"
        try:
            async with httpx.AsyncClient(
                timeout=self.config.timeout_seconds
            ) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=report_payload,
                )
                response.raise_for_status()
                logger.info("Report pushed to Time Loom successfully.")
                return True
        except Exception as e:
            logger.error("Failed to push report to Time Loom: %s", e)
            return False

    async def health_check(self) -> Dict[str, Any]:
        """Check connectivity to the Time Loom platform."""
        try:
            data = await self._request(
                f"{self.config.base_url}{self.config.api_prefix}/health"
            )
            return {"status": "connected", "details": data}
        except Exception as e:
            return {"status": "disconnected", "error": str(e)}
