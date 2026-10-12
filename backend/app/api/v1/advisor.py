from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Asset, Transaction, ExpenseCategoryEnum
from app.schemas.advisor_dtos import AdviceRequest, ScenarioRunRequest
from app.services.stress_gallery_service import StressGalleryService, StressScenario
from app.services.advisor_service import AgenticAdvisorService
from app.services.monte_carlo_engine import VectorizedMonteCarloEngine
from app.services.classifier_service import EnsembleClassifier

router = APIRouter(prefix="/advisor", tags=["Phase 4: Local RAG AI Advisor & Stress Gallery"])


@router.get("/scenarios", response_model=List[StressScenario])
async def list_stress_scenarios():
    """
    Returns available pre-configured financial shock scenarios (Tech Layoff, Stagflation, etc.).
    """
    return StressGalleryService.get_all_scenarios()


@router.post("/scenarios/run")
async def run_stress_scenario(
    req: ScenarioRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs a 1-click stress scenario against the user's actual balance sheet.
    """
    scenario = StressGalleryService.get_scenario_by_id(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Stress scenario not found")

    # 1. Fetch user assets & spending
    asset_res = await db.execute(select(Asset).where(Asset.user_id == current_user.id))
    assets = asset_res.scalars().all()
    # Deduct unexpected lump-sum shock from starting assets if applicable
    raw_liquid = sum(a.amount for a in assets)
    effective_liquid = max(raw_liquid - scenario.unexpected_lump_sum_shock, 0.0)

    tx_res = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    txs = tx_res.scalars().all()

    monthly_essential = {}
    monthly_flexible = {}
    monthly_income = {}

    for t in txs:
        m_key = t.date.strftime("%Y-%m")
        if t.is_income:
            monthly_income[m_key] = monthly_income.get(m_key, 0.0) + t.amount
        elif not t.is_anomaly:
            if t.category == ExpenseCategoryEnum.ESSENTIAL:
                monthly_essential[m_key] = monthly_essential.get(m_key, 0.0) + t.amount
            elif t.category == ExpenseCategoryEnum.FLEXIBLE:
                monthly_flexible[m_key] = monthly_flexible.get(m_key, 0.0) + t.amount

    avg_essential = (sum(monthly_essential.values()) / max(len(monthly_essential), 1)) if monthly_essential else 2000.0
    avg_flexible = (sum(monthly_flexible.values()) / max(len(monthly_flexible), 1)) if monthly_flexible else 800.0
    avg_income = (sum(monthly_income.values()) / max(len(monthly_income), 1)) if monthly_income else 4000.0

    target_months = req.target_survival_months or scenario.recommended_target_months

    # 2. Execute Simulation with scenario parameters
    sim_result = VectorizedMonteCarloEngine.run_simulation(
        initial_liquid_assets=effective_liquid,
        monthly_income=avg_income,
        monthly_essential_expense=avg_essential,
        monthly_flexible_expense=avg_flexible,
        crisis_duration_months=scenario.crisis_duration_months,
        income_retention_pct=scenario.income_retention_pct,
        expected_annual_inflation_pct=scenario.inflation_rate_pct,
        expected_annual_yield_pct=scenario.investment_yield_pct,
        target_survival_months=target_months,
        num_simulations=3000
    )

    sim_result["scenario"] = scenario.model_dump()
    sim_result["unexpected_shock_deducted"] = scenario.unexpected_lump_sum_shock
    return sim_result


@router.post("/chat")
async def chat_with_advisor(
    req: AdviceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates tailored resilience advice and answers questions using user metrics.
    """
    # 1. Fetch user assets & spending
    asset_res = await db.execute(select(Asset).where(Asset.user_id == current_user.id))
    assets = asset_res.scalars().all()
    total_liquid = sum(a.amount for a in assets)

    tx_res = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    txs = tx_res.scalars().all()

    essential_sum = sum(t.amount for t in txs if t.category == ExpenseCategoryEnum.ESSENTIAL and not t.is_anomaly and not t.is_income)
    flexible_sum = sum(t.amount for t in txs if t.category == ExpenseCategoryEnum.FLEXIBLE and not t.is_anomaly and not t.is_income)
    rigidity_data = EnsembleClassifier.calculate_rigidity(essential_sum, flexible_sum)

    # 2. Quick simulation baseline
    sim_res = VectorizedMonteCarloEngine.run_simulation(
        initial_liquid_assets=total_liquid,
        monthly_income=4000.0,
        monthly_essential_expense=max(essential_sum / 2.0, 1500.0),
        monthly_flexible_expense=max(flexible_sum / 2.0, 500.0),
        crisis_duration_months=6,
        income_retention_pct=0.0,
        num_simulations=1000,
        target_survival_months=12
    )

    user_context = {
        "total_liquid_assets": total_liquid,
        "rigidity_score": rigidity_data["rigidity_score"]
    }

    advice = await AgenticAdvisorService.generate_advice(
        user_context=user_context,
        simulation_results=sim_res,
        user_question=req.user_question
    )

    return advice
