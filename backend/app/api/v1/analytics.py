from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Transaction, ExpenseCategoryEnum
from app.services.classifier_service import EnsembleClassifier
from app.services.anomaly_service import AnomalyReviewService
from app.services.forecasting_service import AdaptiveForecastingService

router = APIRouter(prefix="/analytics", tags=["Phase 2: Analytics & ML Engine"])


@router.get("/rigidity")
async def get_budget_rigidity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes Budget Rigidity vs Elasticity from the user's categorized expenditures.
    """
    result = await db.execute(
        select(Transaction).where(
            (Transaction.user_id == current_user.id) &
            (Transaction.is_income == False)
        )
    )
    transactions = result.scalars().all()

    essential_sum = sum(t.amount for t in transactions if t.category == ExpenseCategoryEnum.ESSENTIAL and not t.is_anomaly)
    flexible_sum = sum(t.amount for t in transactions if t.category == ExpenseCategoryEnum.FLEXIBLE and not t.is_anomaly)

    rigidity_analysis = EnsembleClassifier.calculate_rigidity(essential_sum, flexible_sum)
    rigidity_analysis["total_essential_expenses"] = round(essential_sum, 2)
    rigidity_analysis["total_flexible_expenses"] = round(flexible_sum, 2)
    return rigidity_analysis


@router.get("/anomalies")
async def detect_anomalies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Scans transactions for one-off financial shocks (medical bills, large purchases)
    using robust modified Z-score statistics.
    """
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id)
    )
    transactions = result.scalars().all()
    anomalies = AnomalyReviewService.detect_outliers_statistical(transactions)
    return {
        "count": len(anomalies),
        "anomalies": anomalies
    }


@router.post("/anomalies/{transaction_id}/review")
async def review_anomaly(
    transaction_id: str,
    action: str = Body(..., embed=True), # 'ONE_TIME_SHOCK', 'RECURRING_ESSENTIAL', 'FLEXIBLE'
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Human-in-the-loop endpoint allowing users to confirm or override detected shocks.
    """
    result = await db.execute(
        select(Transaction).where(
            (Transaction.id == transaction_id) &
            (Transaction.user_id == current_user.id)
        )
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if action == "ONE_TIME_SHOCK":
        tx.is_anomaly = True
        tx.category = ExpenseCategoryEnum.SHOCK_OUTLIER
        tx.anomaly_reason = "Confirmed one-time shock: excluded from baseline runway burn"
    elif action == "RECURRING_ESSENTIAL":
        tx.is_anomaly = False
        tx.category = ExpenseCategoryEnum.ESSENTIAL
        tx.anomaly_reason = None
    elif action == "FLEXIBLE":
        tx.is_anomaly = False
        tx.category = ExpenseCategoryEnum.FLEXIBLE
        tx.anomaly_reason = None
    else:
        raise HTTPException(status_code=400, detail="Invalid review action")

    await db.commit()
    return {"message": "Transaction review status updated successfully", "transaction_id": tx.id, "new_category": tx.category}


@router.get("/forecast")
async def get_expense_forecast(
    horizon_months: int = Query(12, ge=3, le=60),
    inflation_rate: float = Query(4.0, ge=0.0, le=25.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Produces multi-month essential expense projection using the Adaptive Forecaster.
    """
    result = await db.execute(
        select(Transaction).where(
            (Transaction.user_id == current_user.id) &
            (Transaction.is_income == False) &
            (Transaction.category == ExpenseCategoryEnum.ESSENTIAL) &
            (Transaction.is_anomaly == False)
        )
    )
    txs = result.scalars().all()

    # Aggregate by month
    monthly_dict = {}
    for t in txs:
        m_key = t.date.strftime("%Y-%m")
        monthly_dict[m_key] = monthly_dict.get(m_key, 0.0) + t.amount

    sorted_keys = sorted(monthly_dict.keys())
    monthly_series = [monthly_dict[k] for k in sorted_keys]

    forecast = AdaptiveForecastingService.generate_expense_forecast(
        monthly_series=monthly_series,
        forecast_horizon_months=horizon_months,
        annual_inflation_rate_pct=inflation_rate
    )
    return forecast
