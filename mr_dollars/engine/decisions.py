"""
Mr. Dollars — Decision Engine

Rulebook-first decision engine. Produces APPROVE / HOLD / REJECT verdicts
with confidence scores and actionable next steps.

Book-grounded:
- Measurable objectives + evaluation (Master Educator)
- Management control loop: expectations vs actuals -> corrective actions
- Credit/obligations lens (Beaumont unified theory)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from mr_dollars.engine.behavioral import behavioral_warnings
from mr_dollars.engine.models import Decision, ObjectivesConfig, TimeLoomSnapshot


def decide(
    s: TimeLoomSnapshot,
    metrics: Dict[str, float],
    variance: Dict[str, Any],
    obj: ObjectivesConfig,
    prior_metrics: Optional[Dict[str, float]] = None,
) -> Tuple[List[Decision], List[str]]:
    """
    Run the decision rulebook against current metrics.
    Returns (decisions, next_actions).
    """
    decisions: List[Decision] = []
    actions: List[str] = []

    # Rule: protect cash obligations (credit/obligation lens)
    if metrics["weekly_net_cash_est"] <= 0 or metrics[
        "obligations_next_30d"
    ] > max(0.0, s.net_revenue):
        decisions.append(
            Decision(
                key="cash_protection_mode",
                verdict="APPROVE",
                reason=(
                    "Activate cash protection mode: preserve liquidity "
                    "until obligations are comfortably covered."
                ),
                confidence=0.80,
            )
        )
        actions.append(
            "Freeze non-essential spend; review subscriptions "
            "and discretionary inventory."
        )
        actions.append(
            "Tighten deposits/confirmation for high no-show windows."
        )

    # Utilization / capacity
    if metrics["utilization"] < obj.utilization_target:
        decisions.append(
            Decision(
                key="capacity_expansion",
                verdict="REJECT",
                reason=(
                    "Do not expand capacity while utilization is below "
                    "target; fix demand + scheduling first."
                ),
                confidence=0.85,
            )
        )
        actions.append(
            "Run rebook workflow and waitlist fills; "
            "compress schedule to peak demand windows."
        )
    else:
        decisions.append(
            Decision(
                key="capacity_expansion",
                verdict="HOLD",
                reason=(
                    "Capacity is healthy; evaluate expansion only if "
                    "net margin and rebook stability persist."
                ),
                confidence=0.70,
            )
        )

    # No-show discipline
    if metrics["no_show_rate"] > obj.no_show_max:
        decisions.append(
            Decision(
                key="no_show_controls",
                verdict="APPROVE",
                reason=(
                    "No-show rate exceeds maximum; implement controls "
                    "to protect cash flow and time utilization."
                ),
                confidence=0.90,
            )
        )
        actions.append(
            "Require deposits for new clients and for peak hours; "
            "add 24h + 2h confirmations."
        )

    # Cancel rate check
    if metrics["cancel_rate"] > obj.cancel_max:
        decisions.append(
            Decision(
                key="cancellation_controls",
                verdict="APPROVE",
                reason=(
                    "Cancellation rate exceeds threshold; "
                    "review booking policies and confirmation flow."
                ),
                confidence=0.80,
            )
        )
        actions.append(
            "Enforce cancellation policy; require 24h notice "
            "and charge late-cancel fees on repeat offenders."
        )

    # Pricing logic
    if (
        metrics["net_margin"] < obj.net_margin_min
        and metrics["utilization"] >= obj.utilization_target
    ):
        decisions.append(
            Decision(
                key="pricing_adjustment",
                verdict="APPROVE",
                reason=(
                    "Margin below minimum while demand is strong; "
                    "pricing or service mix must adjust."
                ),
                confidence=0.75,
            )
        )
        actions.append(
            "Increase price on top 1-2 high-demand services; "
            "keep change small and measure rebook impact."
        )

    # Rebook health
    if metrics["rebook_rate"] < obj.rebook_target:
        decisions.append(
            Decision(
                key="rebook_initiative",
                verdict="APPROVE",
                reason=(
                    "Rebook rate below target; client retention "
                    "requires active intervention."
                ),
                confidence=0.75,
            )
        )
        actions.append(
            "Activate rebook prompts at checkout; "
            "offer next-visit incentives for first-time clients."
        )

    # Behavioral warnings (added to actions as guardrails)
    for w in behavioral_warnings(metrics, prior_metrics, obj):
        actions.append(w)

    # Deduplicate and trim actions: max 5 operational + behavioral
    trimmed: List[str] = []
    for a in actions:
        if a not in trimmed:
            trimmed.append(a)
    trimmed = trimmed[:6]

    return decisions, trimmed
