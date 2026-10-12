import pytest
from app.services.monte_carlo_engine import VectorizedMonteCarloEngine
from app.services.liquidity_cascade import LiquidityCascadeEngine


def test_vectorized_monte_carlo_execution():
    # Run 2,000 simulations
    res = VectorizedMonteCarloEngine.run_simulation(
        initial_liquid_assets=15000.0,
        monthly_income=4000.0,
        monthly_essential_expense=2000.0,
        monthly_flexible_expense=1000.0,
        crisis_duration_months=6,
        income_retention_pct=0.0, # Complete layoff for 6 months
        num_simulations=2000,
        target_survival_months=12
    )

    assert res["num_simulations"] == 2000
    assert 0.0 <= res["prob_surviving_target"] <= 100.0
    assert 0.0 <= res["prob_surviving_crisis"] <= 100.0
    assert len(res["timelines"]["p50_median"]) == 13
    assert len(res["timelines"]["p10_worst"]) == 13
    assert res["optimal_fund_target"] > 0.0


def test_liquidity_cascade_friction_and_penalties():
    assets = [
        {
            "id": "1",
            "name": "Checking Cash",
            "tier": "CASH",
            "amount": 2000.0,
            "penalty_pct": 0.0,
            "tax_haircut_pct": 0.0,
            "liquidation_order": 1
        },
        {
            "id": "2",
            "name": "Fixed Deposit",
            "tier": "FIXED_DEPOSIT",
            "amount": 5000.0,
            "penalty_pct": 2.0,  # 2% early break penalty
            "tax_haircut_pct": 0.0,
            "liquidation_order": 2
        }
    ]

    # Need $3,000: draws all $2,000 Cash, then draws gross ~1,020.41 from FD to yield net $1,000
    res = LiquidityCascadeEngine.execute_liquidation_step(assets, cash_needed=3000.0)

    assert res["deficit_remaining"] == 0.0
    assert res["is_exhausted"] is False
    assert len(res["liquidations"]) == 2
    assert res["liquidations"][0]["net_cash_realized"] == 2000.0
    assert res["liquidations"][1]["net_cash_realized"] == 1000.0
    assert res["total_penalties"] > 0.0  # FD penalty applied
