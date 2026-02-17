#!/usr/bin/env python3
"""
Mr. Dollars — Entry Point

Launch the Mr. Dollars Financial Intelligence Assistant.

Usage:
    python main.py                  # Start web server (default port 8000)
    python main.py --port 9000      # Custom port
    python main.py --demo           # Run demo report to console only
"""

from __future__ import annotations

import argparse
import sys
from datetime import date


def run_demo():
    """Run the demo report engine and print to console."""
    from mr_dollars.engine.models import ObjectivesConfig, TimeLoomSnapshot
    from mr_dollars.engine.reports import build_report
    from mr_dollars.delivery.channels import ConsoleChannel

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

    obj = ObjectivesConfig()
    report = build_report(snapshot, obj)
    ConsoleChannel().deliver(report)


def run_server(host: str, port: int):
    """Start the Mr. Dollars web server."""
    import uvicorn
    uvicorn.run(
        "mr_dollars.api.app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )


def main():
    parser = argparse.ArgumentParser(
        description="Mr. Dollars — Financial Intelligence Assistant"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run demo report to console (no server)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Server host (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Server port (default: 8000)",
    )
    args = parser.parse_args()

    if args.demo:
        run_demo()
    else:
        run_server(args.host, args.port)


if __name__ == "__main__":
    main()
