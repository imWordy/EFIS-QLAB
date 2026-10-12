from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Asset, Transaction, ExpenseCategoryEnum
from app.services.dynamic_nlp_service import DynamicNLPService
import pandas as pd
import io

router = APIRouter(prefix="/dataset", tags=["Dynamic Dataset Ingestion & NLP"])


@router.post("/upload-assets")
async def upload_custom_assets_csv(
    file: UploadFile = File(...),
    replace_existing: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically ingests custom user asset CSVs without hardcoded schemas.
    Accepts arbitrary column names (e.g. 'asset_type', 'asset_name', 'holding', 'balance', 'value').
    Applies DynamicNLPService to infer liquidity tiers, yields, and penalty haircuts.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_bytes = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    df.columns = [c.strip().lower() for c in df.columns]

    # Detect asset type name column
    name_col = next((c for c in df.columns if any(k in c for k in ["asset", "type", "name", "holding", "category", "item"])), None)
    val_col = next((c for c in df.columns if any(k in c for k in ["val", "amount", "balance", "price", "worth", "total"])), None)

    if not (name_col and val_col):
        raise HTTPException(status_code=422, detail=f"Could not automatically detect asset name and value columns. Columns found: {list(df.columns)}")

    if replace_existing:
        # Clear existing assets for this user to enable clean re-simulation
        existing = await db.execute(select(Asset).where(Asset.user_id == current_user.id))
        for a in existing.scalars().all():
            await db.delete(a)

    created_assets = []
    insights = []

    for _, row in df.iterrows():
        raw_name = str(row[name_col]).strip()
        raw_val = row[val_col]
        try:
            cleaned_val = float(str(raw_val).replace("$", "").replace(",", "").strip())
        except (ValueError, TypeError):
            continue

        if cleaned_val <= 0:
            continue

        # Dynamic NLP Semantic Inference
        nlp_specs = DynamicNLPService.infer_asset_properties(raw_name, cleaned_val)

        new_asset = Asset(
            user_id=current_user.id,
            name=raw_name.replace("_", " ").title(),
            tier=nlp_specs["inferred_tier"],
            amount=cleaned_val,
            annual_yield_pct=nlp_specs["annual_yield_pct"],
            liquidity_days=nlp_specs["liquidity_days"],
            penalty_pct=nlp_specs["penalty_pct"],
            tax_haircut_pct=nlp_specs["tax_haircut_pct"],
            liquidation_order=nlp_specs["liquidation_order"]
        )
        created_assets.append(new_asset)
        insights.append({
            "asset_name": new_asset.name,
            "amount": cleaned_val,
            "inferred_tier": new_asset.tier.value,
            "confidence": nlp_specs["confidence_score"],
            "liquidity_order": new_asset.liquidation_order
        })

    db.add_all(created_assets)
    await db.commit()

    total_value = sum(a.amount for a in created_assets)
    return {
        "status": "success",
        "message": f"Successfully parsed and dynamically categorized {len(created_assets)} assets using NLP.",
        "total_asset_value": total_value,
        "assets_parsed": insights
    }


@router.post("/upload-transactions")
async def upload_custom_transactions_csv(
    file: UploadFile = File(...),
    replace_existing: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically ingests custom transactions CSVs without rigid schemas.
    Accepts arbitrary column labels and uses semantic NLP classification
    to classify each transaction as ESSENTIAL vs FLEXIBLE on the fly.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_bytes = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    df.columns = [c.strip().lower() for c in df.columns]

    date_col = next((c for c in df.columns if "date" in c or "time" in c), None)
    amt_col = next((c for c in df.columns if any(k in c for k in ["amount", "val", "debit", "credit", "price"])), None)
    desc_col = next((c for c in df.columns if any(k in c for k in ["desc", "category", "merchant", "narrat", "type", "detail"])), None)

    if not (date_col and amt_col and desc_col):
        raise HTTPException(status_code=422, detail=f"Missing date, amount, or description/category column. Found: {list(df.columns)}")

    if replace_existing:
        existing = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id))
        for t in existing.scalars().all():
            await db.delete(t)

    created_txs = []
    total_income = 0.0
    total_essential = 0.0
    total_flexible = 0.0

    df["clean_date"] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=["clean_date"])

    for _, row in df.iterrows():
        raw_amt = row[amt_col]
        try:
            amt = float(str(raw_amt).replace("$", "").replace(",", "").strip())
        except (ValueError, TypeError):
            continue

        raw_desc = str(row[desc_col]).strip()
        date_val = row["clean_date"].to_pydatetime()

        # Check explicit type column if present
        is_income = False
        if "type" in df.columns:
            type_str = str(row.get("type", "")).lower()
            if "income" in type_str or "credit" in type_str:
                is_income = True

        if amt < 0:
            is_income = False
            amt = abs(amt)
        elif not is_income and "income" in raw_desc.lower() or "salary" in raw_desc.lower() or "bonus" in raw_desc.lower():
            is_income = True

        if is_income:
            total_income += amt
            cat = ExpenseCategoryEnum.ESSENTIAL
            conf = 1.0
        else:
            # Dynamic NLP Expense Classification
            cat, conf, rationale = DynamicNLPService.classify_expense_dynamically(raw_desc, amt)
            if cat == ExpenseCategoryEnum.ESSENTIAL:
                total_essential += amt
            else:
                total_flexible += amt

        tx = Transaction(
            user_id=current_user.id,
            date=date_val,
            description=raw_desc.replace("_", " ").title(),
            amount=amt,
            category=cat,
            is_income=is_income,
            notes=f"NLP Classified: {conf*100:.0f}% confidence"
        )
        created_txs.append(tx)

    # Batch save
    db.add_all(created_txs)
    await db.commit()

    total_exp = total_essential + total_flexible
    rigidity_pct = (total_essential / total_exp * 100.0) if total_exp > 0 else 50.0

    return {
        "status": "success",
        "message": f"Successfully parsed {len(created_txs)} transactions with dynamic semantic NLP categorization.",
        "summary": {
            "transactions_count": len(created_txs),
            "total_income": round(total_income, 2),
            "total_essential_expenses": round(total_essential, 2),
            "total_flexible_expenses": round(total_flexible, 2),
            "dynamic_rigidity_score": round(rigidity_pct, 1)
        }
    }
