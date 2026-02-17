"""
Mr. Dollars — Behavioral Guardrails

Anti-drift, anti-bias warnings grounded in behavioral finance principles.
Prevents the operator from making reactionary decisions based on single-period swings.

Book-grounded:
- Behavioral finance guardrails: anchoring, framing, heuristics/bias warnings
- Stable outputs: same inputs -> same decisions
"""

from __future__ import annotations

from typing import Dict, List, Optional

from mr_dollars.engine.models import ObjectivesConfig


def behavioral_warnings(
    current_metrics: Dict[str, float],
    prior_metrics: Optional[Dict[str, float]],
    obj: ObjectivesConfig,
) -> List[str]:
    """
    Generate behavioral finance warnings based on current vs prior metrics.
    Designed to prevent impulsive reactions to volatile data.
    """
    warnings: List[str] = []

    if obj.require_two_periods_for_trend_claim and prior_metrics is None:
        warnings.append(
            "Trend discipline: do not declare a trend from a single period. "
            "Collect at least 2 periods."
        )
        return warnings

    if prior_metrics:
        # Anchoring / overreaction flags: big swings trigger bad decisions
        current_cash = current_metrics.get("weekly_net_cash_est", 0.0)
        prior_cash = prior_metrics.get("weekly_net_cash_est", 0.0)
        delta_rev = current_cash - prior_cash

        if abs(delta_rev) > 0 and abs(delta_rev) > abs(
            prior_metrics.get("weekly_net_cash_est", 1.0)
        ) * 0.5:
            warnings.append(
                "Behavioral risk: large swing detected. "
                "Avoid anchoring on last period; use ranges and confirm causes."
            )

        # Framing bias: if utilization went up but revenue went down, flag it
        current_util = current_metrics.get("utilization", 0.0)
        prior_util = prior_metrics.get("utilization", 0.0)
        current_margin = current_metrics.get("net_margin", 0.0)
        prior_margin = prior_metrics.get("net_margin", 0.0)

        if current_util > prior_util and current_margin < prior_margin:
            warnings.append(
                "Framing check: utilization improved but margin declined. "
                "Investigate service mix or cost changes before celebrating."
            )

    return warnings
