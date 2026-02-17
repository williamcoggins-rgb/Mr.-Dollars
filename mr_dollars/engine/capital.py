"""
Mr. Dollars — Capital Budgeting

NPV, IRR, and range-of-viability analysis for capital decisions.

Book-grounded:
- Capital budgeting with uncertainty and ranges (Evaluating Capital Projects)
- Cost/risk/contingency thinking (Cost Engineering discipline)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from mr_dollars.engine.models import ObjectivesConfig


def npv(discount_rate: float, cashflows: List[float]) -> float:
    """
    Net Present Value.
    cashflows[0] is typically negative (initial investment).
    """
    total = 0.0
    for t, cf in enumerate(cashflows):
        total += cf / ((1.0 + discount_rate) ** t)
    return total


def irr(cashflows: List[float], guess: float = 0.1) -> Optional[float]:
    """
    Internal Rate of Return via Newton-Raphson.
    Returns None if convergence fails.
    """
    r = guess
    for _ in range(50):
        f = 0.0
        df = 0.0
        for t, cf in enumerate(cashflows):
            denom = (1.0 + r) ** t
            f += cf / denom
            if t > 0:
                df -= t * cf / ((1.0 + r) ** (t + 1))
        if abs(df) < 1e-9:
            return None
        new_r = r - f / df
        if not (-0.99 < new_r < 10.0):
            return None
        if abs(new_r - r) < 1e-7:
            return new_r
        r = new_r
    return None


def evaluate_capital_project(
    cashflows: List[float], obj: ObjectivesConfig
) -> Dict[str, Any]:
    """
    Range-of-viability approach:
    - Compute NPV at base discount rate and at low/high rates.
    - Decision depends on whether NPV stays positive across the range.
    """
    base = obj.discount_rate_annual
    lo, hi = obj.discount_rate_range

    out: Dict[str, Any] = {
        "npv_base": npv(base, cashflows),
        "npv_lo": npv(lo, cashflows),
        "npv_hi": npv(hi, cashflows),
        "irr": irr(cashflows),
    }
    out["robust_positive"] = out["npv_lo"] > 0.0 and out["npv_hi"] > 0.0
    out["fragile_positive"] = out["npv_lo"] > 0.0 and out["npv_hi"] <= 0.0
    return out
