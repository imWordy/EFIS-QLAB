import pytest
from app.services.stress_gallery_service import StressGalleryService, PRESET_SCENARIOS
from app.services.advisor_service import AgenticAdvisorService


def test_stress_scenarios_listing():
    scenarios = StressGalleryService.get_all_scenarios()
    assert len(scenarios) == 4
    tech_layoff = StressGalleryService.get_scenario_by_id("tech_layoff")
    assert tech_layoff is not None
    assert tech_layoff.crisis_duration_months == 8
    assert tech_layoff.income_retention_pct == 0.0


@pytest.mark.asyncio
async def test_agentic_advisor_fallback_synthesis():
    user_context = {
        "total_liquid_assets": 12000.0,
        "rigidity_score": 82.5  # Critical rigidity
    }
    simulation_results = {
        "prob_surviving_target": 62.0,
        "median_survival_months": 5.5,
        "worst_case_survival_months": 3.8,
        "capital_shortfall": 4500.0
    }

    advice = await AgenticAdvisorService.generate_advice(
        user_context=user_context,
        simulation_results=simulation_results,
        user_question="How can I prepare for a potential layoff?"
    )

    assert advice["verdict"] == "ANALYSIS_COMPLETE"
    assert "summary" in advice
    assert "De-Rigidify" in advice["summary"] or "Reserve Top-Up" in advice["summary"]
    assert advice["key_metrics"]["survival_probability"] == 62.0
