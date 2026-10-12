import pytest
from app.services.classifier_service import EnsembleClassifier, ExpenseCategoryEnum
from app.services.forecasting_service import AdaptiveForecastingService


def test_ensemble_classification():
    cat, conf, match = EnsembleClassifier.classify_transaction("Equinox Gym Membership", 220.0)
    assert cat == ExpenseCategoryEnum.FLEXIBLE

    cat2, conf2, match2 = EnsembleClassifier.classify_transaction("State Farm Car Insurance", 150.0)
    assert cat2 == ExpenseCategoryEnum.ESSENTIAL


def test_rigidity_calculation():
    # 3000 essential, 1000 flexible -> 75% rigidity
    rigidity_res = EnsembleClassifier.calculate_rigidity(3000.0, 1000.0)
    assert rigidity_res["rigidity_score"] == 75.0
    assert rigidity_res["elasticity_score"] == 25.0
    assert rigidity_res["risk_tier"] == "MODERATE"


def test_adaptive_forecasting_fallbacks():
    # 2 sample points -> uses Weighted Moving Average with inflation
    res_short = AdaptiveForecastingService.generate_expense_forecast([2000.0, 2100.0], forecast_horizon_months=6)
    assert res_short["model_used"] == "WEIGHTED_MOVING_AVERAGE"
    assert len(res_short["projected_curve"]) == 6

    # 6 sample points -> uses Holt Linear
    res_med = AdaptiveForecastingService.generate_expense_forecast([2000.0, 2050.0, 2100.0, 2150.0, 2200.0, 2250.0], forecast_horizon_months=6)
    assert res_med["model_used"] == "HOLT_LINEAR_EXPONENTIAL_SMOOTHING"
    assert len(res_med["projected_curve"]) == 6
