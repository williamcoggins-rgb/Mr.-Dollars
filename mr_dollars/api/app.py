"""
Mr. Dollars — FastAPI Application

Main web application serving the Mr. Dollars intelligence platform.
Provides:
- Static file serving (UI assets)
- REST API for report generation, capital evaluation, and Time Loom status
- WebSocket for live report push to the animated dollar UI
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from mr_dollars.delivery.channels import WebSocketChannel
from mr_dollars.engine.capital import evaluate_capital_project
from mr_dollars.engine.metrics import compute_metrics, compute_variance
from mr_dollars.engine.models import (
    DollarsReport,
    ObjectivesConfig,
    TimeLoomSnapshot,
)
from mr_dollars.engine.reports import build_report
from mr_dollars.timeloom.client import TimeLoomClient, TimeLoomConfig

logger = logging.getLogger("mr_dollars.api")

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

# Shared state
ws_channel = WebSocketChannel()
timeloom_client = TimeLoomClient()
objectives = ObjectivesConfig()
last_report: Optional[DollarsReport] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Mr. Dollars starting up")
    yield
    logger.info("Mr. Dollars shutting down")


app = FastAPI(
    title="Mr. Dollars",
    description="Financial Intelligence Assistant for Barber Operations",
    version="0.1.0",
    lifespan=lifespan,
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# --- Pydantic models for API ---

class ReportRequest(BaseModel):
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class CapitalRequest(BaseModel):
    cashflows: List[float]


class SnapshotInput(BaseModel):
    period_start: str
    period_end: str
    appointments_total: int
    appointments_completed: int
    appointments_canceled: int
    appointments_no_show: int
    gross_revenue: float
    net_revenue: float
    tips: float
    available_hours: float
    booked_hours: float
    clients_total: int
    clients_returning: int
    rebooks_within_30d: int
    revenue_by_service: Dict[str, float] = {}
    count_by_service: Dict[str, int] = {}
    variable_costs: float = 0.0
    fixed_costs: float = 0.0
    obligations_next_30d: float = 0.0


class TimeLoomConfigInput(BaseModel):
    base_url: str = "http://localhost:8100"
    api_prefix: str = "/api/v1/timeloom"
    api_key: Optional[str] = None


# --- Routes ---

@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve the Mr. Dollars UI."""
    html_path = TEMPLATES_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text(), status_code=200)


@app.post("/api/report/generate")
async def generate_report(req: ReportRequest = None):
    """
    Generate a report by fetching data from Time Loom.
    Falls back to cached data or returns an error if Time Loom is unavailable.
    """
    global last_report

    try:
        today = date.today()
        start = (
            date.fromisoformat(req.period_start)
            if req and req.period_start
            else today.replace(day=1)
        )
        end = (
            date.fromisoformat(req.period_end)
            if req and req.period_end
            else today
        )

        snapshot = await timeloom_client.fetch_snapshot(start, end)
        report = build_report(snapshot, objectives)
        last_report = report

        # Broadcast to connected WebSocket clients
        await ws_channel.deliver(report)

        return {"status": "ok", "report": report.json_payload}
    except Exception as e:
        logger.error("Report generation failed: %s", e)
        return {
            "status": "error",
            "message": str(e),
            "report": last_report.json_payload if last_report else None,
        }


@app.get("/api/report/demo")
async def demo_report():
    """Generate a report from built-in demo data."""
    global last_report

    snapshot = TimeLoomSnapshot(
        period_start=date(2026, 2, 1),
        period_end=date(2026, 2, 7),
        appointments_total=42,
        appointments_completed=36,
        appointments_canceled=4,
        appointments_no_show=2,
        gross_revenue=2800.0,
        net_revenue=2600.0,
        tips=220.0,
        available_hours=40.0,
        booked_hours=32.0,
        clients_total=30,
        clients_returning=16,
        rebooks_within_30d=14,
        revenue_by_service={
            "Standard Cut": 1400.0,
            "Beard": 500.0,
            "Enhancement": 700.0,
        },
        count_by_service={
            "Standard Cut": 20,
            "Beard": 10,
            "Enhancement": 6,
        },
        variable_costs=180.0,
        fixed_costs=450.0,
        obligations_next_30d=950.0,
    )
    report = build_report(snapshot, objectives)
    last_report = report

    await ws_channel.deliver(report)

    return {"status": "ok", "report": report.json_payload}


@app.post("/api/report/from-snapshot")
async def report_from_snapshot(data: SnapshotInput):
    """Generate a report from a manually provided snapshot."""
    global last_report

    snapshot = TimeLoomSnapshot(
        period_start=date.fromisoformat(data.period_start),
        period_end=date.fromisoformat(data.period_end),
        appointments_total=data.appointments_total,
        appointments_completed=data.appointments_completed,
        appointments_canceled=data.appointments_canceled,
        appointments_no_show=data.appointments_no_show,
        gross_revenue=data.gross_revenue,
        net_revenue=data.net_revenue,
        tips=data.tips,
        available_hours=data.available_hours,
        booked_hours=data.booked_hours,
        clients_total=data.clients_total,
        clients_returning=data.clients_returning,
        rebooks_within_30d=data.rebooks_within_30d,
        revenue_by_service=data.revenue_by_service,
        count_by_service=data.count_by_service,
        variable_costs=data.variable_costs,
        fixed_costs=data.fixed_costs,
        obligations_next_30d=data.obligations_next_30d,
    )
    report = build_report(snapshot, objectives)
    last_report = report

    await ws_channel.deliver(report)

    return {"status": "ok", "report": report.json_payload}


@app.post("/api/capital/evaluate")
async def evaluate_capital(req: CapitalRequest):
    """Evaluate a capital project using NPV/IRR range analysis."""
    result = evaluate_capital_project(req.cashflows, objectives)
    return result


@app.get("/api/timeloom/status")
async def timeloom_status():
    """Check connectivity to the Time Loom platform."""
    status = await timeloom_client.health_check()
    return status


@app.post("/api/timeloom/configure")
async def configure_timeloom(config: TimeLoomConfigInput):
    """Update Time Loom connection settings."""
    global timeloom_client
    timeloom_client = TimeLoomClient(
        TimeLoomConfig(
            base_url=config.base_url,
            api_prefix=config.api_prefix,
            api_key=config.api_key,
        )
    )
    status = await timeloom_client.health_check()
    return {"status": "configured", "connection": status}


@app.get("/api/objectives")
async def get_objectives():
    """Return current objectives configuration."""
    return objectives.to_dict()


# --- WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    WebSocket endpoint for live report updates.
    The Mr. Dollars UI connects here to receive real-time data.
    """
    await ws.accept()
    ws_channel.register(ws)
    logger.info("WebSocket client connected")

    try:
        # Send last report immediately if available
        if last_report:
            await ws.send_text(
                json.dumps({"type": "report", "payload": last_report.json_payload})
            )

        # Keep connection alive, listen for client messages
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "refresh":
                    # Client requested a refresh
                    if last_report:
                        await ws.send_text(
                            json.dumps(
                                {"type": "report", "payload": last_report.json_payload}
                            )
                        )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        ws_channel.unregister(ws)
