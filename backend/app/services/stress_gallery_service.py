from typing import List, Dict, Any
from pydantic import BaseModel, Field


class StressScenario(BaseModel):
    id: str
    name: str
    tagline: str
    description: str
    crisis_duration_months: int
    income_retention_pct: float
    inflation_rate_pct: float
    investment_yield_pct: float
    unexpected_lump_sum_shock: float
    recommended_target_months: int
    icon: str


PRESET_SCENARIOS: List[StressScenario] = [
    StressScenario(
        id="tech_layoff",
        name="The Tech Layoff",
        tagline="Prolonged hiring freeze & severance exhaustion",
        description="Complete income loss for 8 months with continuing full essential bills (rent, health insurance COBRA premiums) in a tight job market.",
        crisis_duration_months=8,
        income_retention_pct=0.0,
        inflation_rate_pct=4.0,
        investment_yield_pct=3.0,
        unexpected_lump_sum_shock=0.0,
        recommended_target_months=9,
        icon="briefcase-off"
    ),
    StressScenario(
        id="stagflation_squeeze",
        name="Stagflation Crisis",
        tagline="10% inflation spike paired with market downturn",
        description="Rapid escalation in basic living essentials (energy, food) coupled with depressed returns on liquid holdings and partial income stagnation.",
        crisis_duration_months=12,
        income_retention_pct=75.0,  # 25% pay cut or freelance slowdown
        inflation_rate_pct=10.0,
        investment_yield_pct=-5.0,  # Negative real yield
        unexpected_lump_sum_shock=0.0,
        recommended_target_months=12,
        icon="trending-down"
    ),
    StressScenario(
        id="critical_medical",
        name="Critical Medical Shock",
        tagline="Out-of-pocket maximum hit + extended recovery",
        description="Immediate $6,000 out-of-pocket medical bill shock, accompanied by 3 months of 50% sick-leave income reduction and ongoing prescription costs.",
        crisis_duration_months=3,
        income_retention_pct=50.0,
        inflation_rate_pct=5.0,
        investment_yield_pct=4.0,
        unexpected_lump_sum_shock=6000.0,
        recommended_target_months=6,
        icon="activity"
    ),
    StressScenario(
        id="compound_perfect_storm",
        name="The Perfect Storm",
        tagline="Simultaneous job loss + sudden emergency + inflation",
        description="The ultimate resilience test: 6 months of zero income, an unexpected $4,000 car/home repair shock, and 8% inflation.",
        crisis_duration_months=6,
        income_retention_pct=0.0,
        inflation_rate_pct=8.0,
        investment_yield_pct=1.0,
        unexpected_lump_sum_shock=4000.0,
        recommended_target_months=12,
        icon="zap"
    )
]


class StressGalleryService:
    @staticmethod
    def get_all_scenarios() -> List[StressScenario]:
        return PRESET_SCENARIOS

    @staticmethod
    def get_scenario_by_id(scenario_id: str) -> StressScenario:
        for s in PRESET_SCENARIOS:
            if s.id == scenario_id:
                return s
        return None
