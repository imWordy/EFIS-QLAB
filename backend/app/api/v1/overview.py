from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Asset, Transaction, ExpenseCategoryEnum, AssetTierEnum

router = APIRouter(prefix="/overview", tags=["Full Financial Dashboard & Expense Intelligence"])


@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes institutional dashboard KPIs exactly as expected:
    - Survival Duration (Months): Usable liquid capital / Average monthly baseline burn
    - Liquidity Score (%): Percentage of total assets that are actually liquid
    - Rigidity Score (%): Percentage of monthly expenses that are essential
    - Avg Monthly Expense, Essential Expense, and Flexible Expense
    """
    # 1. Fetch assets
    asset_res = await db.execute(select(Asset).where(Asset.user_id == current_user.id))
    assets = asset_res.scalars().all()

    total_assets_val = sum(a.amount for a in assets)

    # Effective liquid capital: Tier 1 (Cash: 100%), Tier 2 (High Yield: 100%), Tier 3 (FD: 95% net of penalty),
    # Tier 4 (Liquid MF/Gold: 85% net of tax/haircut), Tier 5 (Equity/Real Estate: 30% emergency liquidity)
    tier_weights = {
        AssetTierEnum.CASH: 1.0,
        AssetTierEnum.HIGH_YIELD: 1.0,
        AssetTierEnum.FIXED_DEPOSIT: 0.95,
        AssetTierEnum.LIQUID_MUTUAL_FUND: 0.85,
        AssetTierEnum.EQUITY: 0.35,
        AssetTierEnum.CREDIT_LINE: 0.80
    }

    effective_liquid_assets = sum(a.amount * tier_weights.get(a.tier, 0.5) for a in assets)
    liquidity_score = round((effective_liquid_assets / total_assets_val * 100.0), 1) if total_assets_val > 0 else 0.0

    # 2. Fetch transactions
    tx_res = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
    txs = tx_res.scalars().all()

    monthly_essential: Dict[str, float] = {}
    monthly_flexible: Dict[str, float] = {}
    monthly_income: Dict[str, float] = {}
    category_totals: Dict[str, Dict[str, Any]] = {}

    for t in txs:
        m_key = t.date.strftime("%Y-%m")
        desc_label = t.description

        if t.is_income:
            monthly_income[m_key] = monthly_income.get(m_key, 0.0) + t.amount
        elif not t.is_anomaly:
            if t.category == ExpenseCategoryEnum.ESSENTIAL:
                monthly_essential[m_key] = monthly_essential.get(m_key, 0.0) + t.amount
            else:
                monthly_flexible[m_key] = monthly_flexible.get(m_key, 0.0) + t.amount

            # Aggregate category breakdown
            if desc_label not in category_totals:
                category_totals[desc_label] = {
                    "category": desc_label,
                    "total": 0.0,
                    "type": t.category.value,
                    "count": 0
                }
            category_totals[desc_label]["total"] += t.amount
            category_totals[desc_label]["count"] += 1

    distinct_months = max(len(set(monthly_essential.keys()) | set(monthly_flexible.keys())), 1)
    avg_essential = sum(monthly_essential.values()) / distinct_months
    avg_flexible = sum(monthly_flexible.values()) / distinct_months
    avg_total_expense = avg_essential + avg_flexible

    rigidity_score = round((avg_essential / avg_total_expense * 100.0), 1) if avg_total_expense > 0 else 50.0

    # Survival duration: effective liquid assets / monthly expense
    survival_months = round((effective_liquid_assets / avg_total_expense), 1) if avg_total_expense > 0 else 0.0

    # Format category table
    category_breakdown = sorted(list(category_totals.values()), key=lambda x: x["total"], reverse=True)

    return {
        "survival_months": survival_months,
        "liquidity_score": liquidity_score,
        "rigidity_score": rigidity_score,
        "avg_monthly_expense": round(avg_total_expense, 2),
        "avg_monthly_essential": round(avg_essential, 2),
        "avg_monthly_flexible": round(avg_flexible, 2),
        "total_assets": round(total_assets_val, 2),
        "effective_liquid_assets": round(effective_liquid_assets, 2),
        "target_survival_months": current_user.target_survival_months or 6,
        "category_breakdown": category_breakdown
    }


@router.post("/toggle-category")
async def toggle_category_type(
    category_name: str = Body(..., embed=True),
    new_type: str = Body(..., embed=True),  # 'ESSENTIAL' or 'FLEXIBLE'
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    User-empowered Expense Intelligence toggle:
    Updates all user transactions under this category to either ESSENTIAL or FLEXIBLE on the fly.
    """
    if new_type not in ["ESSENTIAL", "FLEXIBLE"]:
        raise HTTPException(status_code=400, detail="Type must be ESSENTIAL or FLEXIBLE")

    res = await db.execute(
        select(Transaction).where(
            (Transaction.user_id == current_user.id) &
            (Transaction.description == category_name)
        )
    )
    txs = res.scalars().all()
    if not txs:
        raise HTTPException(status_code=404, detail="Category not found")

    target_enum = ExpenseCategoryEnum.ESSENTIAL if new_type == "ESSENTIAL" else ExpenseCategoryEnum.FLEXIBLE
    for t in txs:
        t.category = target_enum

    await db.commit()
    return {"message": f"Updated {len(txs)} transactions in '{category_name}' to {new_type}"}
