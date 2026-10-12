from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Transaction, ExpenseCategoryEnum
from app.schemas.dtos import TransactionCreate, TransactionOut, IngestionSummary
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/transactions", tags=["Transactions & Ingestion"])


@router.get("/", response_model=List[TransactionOut])
async def get_transactions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    category: Optional[ExpenseCategoryEnum] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Transaction).where(Transaction.user_id == current_user.id)
    if category:
        query = query.where(Transaction.category == category)
    query = query.order_by(Transaction.date.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_single_transaction(
    tx_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tx = Transaction(
        user_id=current_user.id,
        **tx_in.model_dump()
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.post("/upload-csv", response_model=IngestionSummary)
async def upload_csv_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported.")

    file_bytes = await file.read()
    try:
        summary = await IngestionService.process_csv_content(file_bytes, current_user.id, db)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process statement: {str(e)}")
