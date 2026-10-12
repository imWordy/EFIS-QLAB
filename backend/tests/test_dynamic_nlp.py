import pytest
from app.services.dynamic_nlp_service import DynamicNLPService
from app.models.entities import AssetTierEnum, ExpenseCategoryEnum


def test_dynamic_asset_nlp_inference():
    # Test arbitrary user asset types from the downloaded datasets
    res_gold = DynamicNLPService.infer_asset_properties("gold", 553758.0)
    assert res_gold["inferred_tier"] in [AssetTierEnum.LIQUID_MUTUAL_FUND, AssetTierEnum.EQUITY]

    res_epf = DynamicNLPService.infer_asset_properties("epf", 2492198.0)
    assert res_epf["inferred_tier"] == AssetTierEnum.FIXED_DEPOSIT

    res_savings = DynamicNLPService.infer_asset_properties("savings", 9302280.0)
    assert res_savings["inferred_tier"] == AssetTierEnum.HIGH_YIELD

    res_startup = DynamicNLPService.infer_asset_properties("business_ownership", 191283465.0)
    assert res_startup["inferred_tier"] == AssetTierEnum.EQUITY


def test_dynamic_expense_nlp_inference():
    # Test arbitrary categories from user datasets
    cat_emi, conf_emi, _ = DynamicNLPService.classify_expense_dynamically("emi", 762753.0)
    assert cat_emi == ExpenseCategoryEnum.ESSENTIAL

    cat_luxury, conf_lux, _ = DynamicNLPService.classify_expense_dynamically("luxury_shopping", 1316664.0)
    assert cat_luxury == ExpenseCategoryEnum.FLEXIBLE

    cat_utility, _, _ = DynamicNLPService.classify_expense_dynamically("utility", 250.0)
    assert cat_utility == ExpenseCategoryEnum.ESSENTIAL

    cat_dining, _, _ = DynamicNLPService.classify_expense_dynamically("fine_dining", 450.0)
    assert cat_dining == ExpenseCategoryEnum.FLEXIBLE
