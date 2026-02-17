"""
Tests for the Mr. Dollars analytics engine.
"""

from datetime import date

from mr_dollars.engine.behavioral import behavioral_warnings
from mr_dollars.engine.capital import evaluate_capital_project, irr, npv
from mr_dollars.engine.decisions import decide
from mr_dollars.engine.metrics import compute_metrics, compute_variance, safe_div
from mr_dollars.engine.models import ObjectivesConfig, TimeLoomSnapshot
from mr_dollars.engine.reports import build_report


def _make_snapshot(**overrides) -> TimeLoomSnapshot:
    """Create a snapshot with defaults, overriding specific fields."""
    defaults = dict(
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
        variable_costs=180.0,
        fixed_costs=450.0,
        obligations_next_30d=950.0,
    )
    defaults.update(overrides)
    return TimeLoomSnapshot(**defaults)


class TestSafeDiv:
    def test_normal(self):
        assert safe_div(10, 2) == 5.0

    def test_zero_denominator(self):
        assert safe_div(10, 0) == 0.0

    def test_zero_numerator(self):
        assert safe_div(0, 5) == 0.0


class TestComputeMetrics:
    def test_basic_metrics(self):
        s = _make_snapshot()
        m = compute_metrics(s)

        assert abs(m["utilization"] - 0.80) < 0.01
        assert abs(m["no_show_rate"] - 2 / 42) < 0.01
        assert abs(m["cancel_rate"] - 4 / 42) < 0.01
        assert abs(m["completion_rate"] - 36 / 42) < 0.01
        assert abs(m["avg_ticket"] - 2600 / 36) < 0.1
        assert abs(m["returning_rate"] - 16 / 30) < 0.01
        assert abs(m["rebook_rate"] - 14 / 36) < 0.01

    def test_net_margin(self):
        s = _make_snapshot()
        m = compute_metrics(s)
        expected = (2600 - 180 - 450) / 2600
        assert abs(m["net_margin"] - expected) < 0.001

    def test_zero_appointments(self):
        s = _make_snapshot(
            appointments_total=0,
            appointments_completed=0,
            appointments_canceled=0,
            appointments_no_show=0,
            net_revenue=0.0,
            gross_revenue=0.0,
        )
        m = compute_metrics(s)
        assert m["no_show_rate"] == 0.0
        assert m["avg_ticket"] == 0.0


class TestComputeVariance:
    def test_variance_structure(self):
        s = _make_snapshot()
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)

        for key in ["utilization", "no_show_rate", "cancel_rate",
                     "rebook_rate", "returning_rate", "net_margin"]:
            assert key in v
            assert "actual" in v[key]
            assert "target" in v[key]
            assert "delta" in v[key]

    def test_utilization_positive_delta(self):
        s = _make_snapshot()
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)
        # 80% utilization vs 70% target -> positive delta
        assert v["utilization"]["delta"] > 0


class TestCapitalBudgeting:
    def test_npv_slightly_negative(self):
        cfs = [-1000, 400, 400, 400]
        result = npv(0.10, cfs)
        # At 10% discount, these cashflows yield NPV ~ -5.3 (slightly negative)
        assert -10 < result < 0

    def test_npv_basic(self):
        cfs = [-1000, 500, 500, 500]
        result = npv(0.10, cfs)
        assert result > 0

    def test_irr_convergence(self):
        cfs = [-1000, 400, 400, 400, 400]
        result = irr(cfs)
        assert result is not None
        assert 0.0 < result < 1.0

    def test_evaluate_range(self):
        cfs = [-5000, 1500, 1800, 2000, 2200]
        obj = ObjectivesConfig()
        result = evaluate_capital_project(cfs, obj)
        assert "npv_base" in result
        assert "npv_lo" in result
        assert "npv_hi" in result
        assert "irr" in result
        assert "robust_positive" in result


class TestDecisions:
    def test_low_utilization_rejects_expansion(self):
        s = _make_snapshot(booked_hours=20.0, available_hours=40.0)
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)
        decisions, actions = decide(s, m, v, obj)

        capacity_d = [d for d in decisions if d.key == "capacity_expansion"]
        assert len(capacity_d) == 1
        assert capacity_d[0].verdict == "REJECT"

    def test_high_utilization_holds_expansion(self):
        s = _make_snapshot(booked_hours=35.0, available_hours=40.0)
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)
        decisions, actions = decide(s, m, v, obj)

        capacity_d = [d for d in decisions if d.key == "capacity_expansion"]
        assert len(capacity_d) == 1
        assert capacity_d[0].verdict == "HOLD"

    def test_cash_protection_triggered(self):
        s = _make_snapshot(
            net_revenue=500.0,
            obligations_next_30d=2000.0,
        )
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)
        decisions, actions = decide(s, m, v, obj)

        cash_d = [d for d in decisions if d.key == "cash_protection_mode"]
        assert len(cash_d) == 1
        assert cash_d[0].verdict == "APPROVE"

    def test_no_show_controls(self):
        s = _make_snapshot(appointments_no_show=10, appointments_total=40)
        m = compute_metrics(s)
        obj = ObjectivesConfig()
        v = compute_variance(m, obj)
        decisions, actions = decide(s, m, v, obj)

        ns_d = [d for d in decisions if d.key == "no_show_controls"]
        assert len(ns_d) == 1
        assert ns_d[0].verdict == "APPROVE"


class TestBehavioralWarnings:
    def test_single_period_warning(self):
        m = {"weekly_net_cash_est": 1000}
        obj = ObjectivesConfig()
        warnings = behavioral_warnings(m, None, obj)
        assert len(warnings) == 1
        assert "trend" in warnings[0].lower()

    def test_large_swing_warning(self):
        current = {"weekly_net_cash_est": 2000, "utilization": 0.8, "net_margin": 0.3}
        prior = {"weekly_net_cash_est": 500, "utilization": 0.7, "net_margin": 0.25}
        obj = ObjectivesConfig()
        warnings = behavioral_warnings(current, prior, obj)
        assert any("swing" in w.lower() for w in warnings)


class TestBuildReport:
    def test_report_structure(self):
        s = _make_snapshot()
        obj = ObjectivesConfig()
        report = build_report(s, obj)

        assert report.period_start == date(2026, 2, 1)
        assert report.period_end == date(2026, 2, 7)
        assert report.text_summary is not None
        assert "MR. DOLLARS" in report.text_summary
        assert report.json_payload is not None
        assert len(report.decisions) > 0
        assert len(report.next_actions) > 0

    def test_report_with_prior(self):
        s1 = _make_snapshot(
            period_start=date(2026, 1, 25),
            period_end=date(2026, 1, 31),
        )
        s2 = _make_snapshot()
        obj = ObjectivesConfig()
        report = build_report(s2, obj, prior_snapshot=s1)
        assert report.text_summary is not None
