"""
Mr. Dollars — Report Builder

Assembles the complete intelligence report from metrics, variance,
decisions, and actions. Produces both human-readable text and
structured JSON for downstream delivery.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from mr_dollars.engine.decisions import decide
from mr_dollars.engine.metrics import compute_metrics, compute_variance
from mr_dollars.engine.models import (
    Decision,
    DollarsReport,
    ObjectivesConfig,
    TimeLoomSnapshot,
)


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def render_text_summary(
    s: TimeLoomSnapshot,
    metrics: Dict[str, float],
    variance: Dict[str, Any],
    decisions: List[Decision],
    actions: List[str],
) -> str:
    """Render human-readable report text."""
    lines: List[str] = []
    lines.append(
        f"MR. DOLLARS — Intelligence Report "
        f"({s.period_start} -> {s.period_end})"
    )
    lines.append("")
    lines.append("SCOREBOARD")
    lines.append(
        f"  Net revenue: ${s.net_revenue:,.2f}  (tips: ${s.tips:,.2f})"
    )
    lines.append(f"  Avg ticket: ${metrics['avg_ticket']:,.2f}")
    lines.append(f"  Utilization: {_pct(metrics['utilization'])}")
    lines.append(
        f"  No-show: {_pct(metrics['no_show_rate'])} | "
        f"Cancel: {_pct(metrics['cancel_rate'])}"
    )
    lines.append(
        f"  Rebook: {_pct(metrics['rebook_rate'])} | "
        f"Returning: {_pct(metrics['returning_rate'])}"
    )
    lines.append(f"  Net margin: {_pct(metrics['net_margin'])}")
    lines.append(
        f"  Weekly net cash est: ${metrics['weekly_net_cash_est']:,.2f}"
    )
    lines.append("")

    lines.append("DECISIONS")
    for d in decisions:
        lines.append(
            f"  [{d.verdict}] {d.key} — {d.reason} "
            f"(confidence: {d.confidence:.0%})"
        )
    lines.append("")

    lines.append("NEXT ACTIONS")
    for i, a in enumerate(actions, 1):
        lines.append(f"  {i}) {a}")

    return "\n".join(lines)


def build_report(
    snapshot: TimeLoomSnapshot,
    obj: ObjectivesConfig,
    prior_snapshot: Optional[TimeLoomSnapshot] = None,
) -> DollarsReport:
    """
    Build a complete Mr. Dollars intelligence report.
    Optionally accepts a prior snapshot for trend analysis and
    behavioral guardrail checks.
    """
    metrics = compute_metrics(snapshot)
    variance = compute_variance(metrics, obj)
    prior_metrics = compute_metrics(prior_snapshot) if prior_snapshot else None
    decisions, actions = decide(snapshot, metrics, variance, obj, prior_metrics)

    text = render_text_summary(snapshot, metrics, variance, decisions, actions)

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "period_start": str(snapshot.period_start),
        "period_end": str(snapshot.period_end),
        "scoreboard": metrics,
        "variance": variance,
        "decisions": [d.to_dict() for d in decisions],
        "next_actions": actions,
    }

    return DollarsReport(
        generated_at=datetime.utcnow(),
        period_start=snapshot.period_start,
        period_end=snapshot.period_end,
        scoreboard=metrics,
        variance=variance,
        decisions=decisions,
        next_actions=actions,
        text_summary=text,
        json_payload=payload,
    )
