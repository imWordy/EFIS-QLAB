from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Asset, Transaction, ExpenseCategoryEnum
from app.schemas.simulation_dtos import SimulationRequest, LiquidationRequest, LiquidationResponse
from app.services.monte_carlo_engine import VectorizedMonteCarloEngine
from app.services.liquidity_cascade import LiquidityCascadeEngine

router = APIRouter(prefix="/simulation", tags=["Phase 3: Quantitative Simulation Engine"])


@router.post("/run")
async def run_monte_carlo_simulation(
    req: SimulationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a 5,000+ path vectorized Monte Carlo simulation against the user's real balance sheet.
    """
    # 1. Fetch user assets
    asset_res = await db.execute(select(Asset).where(Asset.user_id == current_user.id))
    assets = asset_res.scalars().all()
    total_liquid_assets = sum(a.amount for a in assets)

    # 2. Fetch user baseline spending & income
    tx_res = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    txs = tx_res.scalars().all()

    # Aggregate by month
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

    # 3. Execute Vectorized Monte Carlo Simulation
    sim_result = VectorizedMonteCarloEngine.run_simulation(
        initial_liquid_assets=total_liquid_assets,
        monthly_income=avg_income,
        monthly_essential_expense=avg_essential,
        monthly_flexible_expense=avg_flexible,
        crisis_duration_months=req.crisis_duration_months,
        income_retention_pct=req.income_retention_pct,
        expected_annual_inflation_pct=req.inflation_rate_pct,
        expected_annual_yield_pct=req.investment_yield_pct,
        target_survival_months=req.target_survival_months,
        num_simulations=req.num_simulations,
        panic_runway_threshold_months=req.panic_runway_threshold_months,
        max_deflation_pct=req.max_deflation_pct
    )

    sim_result["user_baseline"] = {
        "total_liquid_assets": round(total_liquid_assets, 2),
        "avg_monthly_income": round(avg_income, 2),
        "avg_monthly_essential": round(avg_essential, 2),
        "avg_monthly_flexible": round(avg_flexible, 2)
    }

    return sim_result


@router.post("/liquidation-cascade", response_model=LiquidationResponse)
async def test_liquidation_cascade(
    req: LiquidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates step-by-step liquidation waterfall with early withdrawal penalties and taxes.
    """
    asset_res = await db.execute(
        select(Asset).where(Asset.user_id == current_user.id).order_by(Asset.liquidation_order)
    )
    assets = asset_res.scalars().all()
    if not assets:
        raise HTTPException(status_code=400, detail="User has no assets recorded.")

    asset_dicts = [
        {
            "id": a.id,
            "name": a.name,
            "tier": a.tier.value,
            "amount": a.amount,
            "penalty_pct": a.penalty_pct,
            "tax_haircut_pct": a.tax_haircut_pct,
            "liquidation_order": a.liquidation_order
        }
        for a in assets
    ]

    cascade_result = LiquidityCascadeEngine.execute_liquidation_step(
        assets=asset_dicts,
        cash_needed=req.cash_needed
    )
    return cascade_result
