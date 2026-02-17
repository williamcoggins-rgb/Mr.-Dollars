"""
Mr. Dollars — Data Contracts

Stable data contracts for the analytics engine.
All inputs normalized to these structures before processing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class TimeLoomSnapshot:
    """
    Normalized operational data from the Time Loom scheduling platform.
    Maps from Time Loom API responses into a stable internal contract.
    """

    period_start: date
    period_end: date

    # Appointments / services
    appointments_total: int
    appointments_completed: int
    appointments_canceled: int
    appointments_no_show: int

    # Revenue
    gross_revenue: float
    net_revenue: float
    tips: float

    # Capacity
    available_hours: float
    booked_hours: float

    # Client behavior
    clients_total: int
    clients_returning: int
    rebooks_within_30d: int

    # Service mix (optional detail)
    revenue_by_service: Dict[str, float] = field(default_factory=dict)
    count_by_service: Dict[str, int] = field(default_factory=dict)

    # Costs (injected from bookkeeping)
    variable_costs: float = 0.0
    fixed_costs: float = 0.0

    # Obligations coming due (rent, loans, subscriptions)
    obligations_next_30d: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "period_start": str(self.period_start),
            "period_end": str(self.period_end),
            "appointments_total": self.appointments_total,
            "appointments_completed": self.appointments_completed,
            "appointments_canceled": self.appointments_canceled,
            "appointments_no_show": self.appointments_no_show,
            "gross_revenue": self.gross_revenue,
            "net_revenue": self.net_revenue,
            "tips": self.tips,
            "available_hours": self.available_hours,
            "booked_hours": self.booked_hours,
            "clients_total": self.clients_total,
            "clients_returning": self.clients_returning,
            "rebooks_within_30d": self.rebooks_within_30d,
            "revenue_by_service": self.revenue_by_service,
            "count_by_service": self.count_by_service,
            "variable_costs": self.variable_costs,
            "fixed_costs": self.fixed_costs,
            "obligations_next_30d": self.obligations_next_30d,
        }


@dataclass(frozen=True)
class ObjectivesConfig:
    """
    Measurable objectives: targets + thresholds.
    Explicit, auditable configuration for the decision engine.

    Book-grounded:
    - Master Educator: measurable objectives + evaluation
    - Cost Engineering: target vs threshold discipline
    """

    utilization_target: float = 0.70
    no_show_max: float = 0.05
    cancel_max: float = 0.10
    rebook_target: float = 0.45
    returning_target: float = 0.55
    net_margin_min: float = 0.25

    runway_weeks_min: float = 4.0

    # Capital decision hurdles
    discount_rate_annual: float = 0.15
    discount_rate_range: Tuple[float, float] = (0.10, 0.25)

    # Behavioral guardrails
    require_two_periods_for_trend_claim: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "utilization_target": self.utilization_target,
            "no_show_max": self.no_show_max,
            "cancel_max": self.cancel_max,
            "rebook_target": self.rebook_target,
            "returning_target": self.returning_target,
            "net_margin_min": self.net_margin_min,
            "runway_weeks_min": self.runway_weeks_min,
            "discount_rate_annual": self.discount_rate_annual,
            "discount_rate_range": list(self.discount_rate_range),
            "require_two_periods_for_trend_claim": self.require_two_periods_for_trend_claim,
        }


@dataclass(frozen=True)
class Decision:
    """A single decision output from the rules engine."""

    key: str
    verdict: str  # "APPROVE" | "HOLD" | "REJECT"
    reason: str
    confidence: float  # 0..1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "verdict": self.verdict,
            "reason": self.reason,
            "confidence": self.confidence,
        }


@dataclass(frozen=True)
class DollarsReport:
    """Complete Mr. Dollars intelligence report."""

    generated_at: datetime
    period_start: date
    period_end: date

    scoreboard: Dict[str, Any]
    variance: Dict[str, Any]
    decisions: List[Decision]
    next_actions: List[str]

    text_summary: str
    json_payload: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return self.json_payload
