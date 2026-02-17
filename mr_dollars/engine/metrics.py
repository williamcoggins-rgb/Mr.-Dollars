"""
Mr. Dollars — Metric Engine

Computes all operational KPIs from a TimeLoomSnapshot.
Deterministic: same inputs always produce the same outputs.

Book-grounded:
- Products -> Cash Flows -> Credit/Obligations lens (Beaumont)
- Management control loop: expectations vs actuals
"""

from __future__ import annotations

from typing import Any, Dict

from mr_dollars.engine.models import ObjectivesConfig, TimeLoomSnapshot


def safe_div(a: float, b: float) -> float:
    """Division with zero-safety."""
    return 0.0 if b == 0 else a / b


def compute_metrics(s: TimeLoomSnapshot) -> Dict[str, float]:
    """
    Compute all scoreboard metrics from a single snapshot.
    Returns a flat dict of named metrics, all floats.
    """
    utilization = safe_div(s.booked_hours, s.available_hours)
    no_show_rate = safe_div(s.appointments_no_show, s.appointments_total)
    cancel_rate = safe_div(s.appointments_canceled, s.appointments_total)
    completion_rate = safe_div(s.appointments_completed, s.appointments_total)

    avg_ticket = (
        safe_div(s.net_revenue, s.appointments_completed)
        if s.appointments_completed
        else 0.0
    )

    net_margin = (
        safe_div(
            (s.net_revenue - s.variable_costs - s.fixed_costs),
            s.net_revenue,
        )
        if s.net_revenue
        else 0.0
    )

    returning_rate = safe_div(s.clients_returning, s.clients_total)
    rebook_rate = safe_div(s.rebooks_within_30d, s.appointments_completed)

    # Weekly net cash generation estimate
    days = max(1, (s.period_end - s.period_start).days + 1)
    weekly_net_cash = (
        (s.net_revenue - s.variable_costs - s.fixed_costs) / days
    ) * 7.0

    # Coverage ratio (rough runway proxy)
    runway_weeks = safe_div(
        max(0.0, weekly_net_cash), max(1.0, s.fixed_costs / 4.0)
    )

    return {
        "utilization": utilization,
        "no_show_rate": no_show_rate,
        "cancel_rate": cancel_rate,
        "completion_rate": completion_rate,
        "avg_ticket": avg_ticket,
        "net_margin": net_margin,
        "returning_rate": returning_rate,
        "rebook_rate": rebook_rate,
        "weekly_net_cash_est": weekly_net_cash,
        "runway_weeks": runway_weeks,
        "obligations_next_30d": s.obligations_next_30d,
    }


def compute_variance(
    metrics: Dict[str, float], obj: ObjectivesConfig
) -> Dict[str, Any]:
    """
    Compare actuals to objectives, producing delta for each tracked KPI.
    Positive delta = above target; negative = below target.
    For max-type thresholds (no_show, cancel), delta > 0 means over limit (bad).
    """

    def v(actual: float, target: float) -> Dict[str, float]:
        return {"actual": actual, "target": target, "delta": actual - target}

    return {
        "utilization": v(metrics["utilization"], obj.utilization_target),
        "no_show_rate": v(metrics["no_show_rate"], obj.no_show_max),
        "cancel_rate": v(metrics["cancel_rate"], obj.cancel_max),
        "rebook_rate": v(metrics["rebook_rate"], obj.rebook_target),
        "returning_rate": v(metrics["returning_rate"], obj.returning_target),
        "net_margin": v(metrics["net_margin"], obj.net_margin_min),
    }
