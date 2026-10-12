from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.entities import AssetTierEnum, ExpenseCategoryEnum


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    base_currency: str = "USD"
    target_survival_months: int = 6


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None


# --- Asset Schemas ---
class AssetBase(BaseModel):
    name: str
    tier: AssetTierEnum
    amount: float = Field(..., ge=0.0)
    annual_yield_pct: float = Field(default=0.0, ge=0.0)
    liquidity_days: int = Field(default=0, ge=0)
    penalty_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    tax_haircut_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    liquidation_order: int = Field(default=1, ge=1)


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[AssetTierEnum] = None
    amount: Optional[float] = None
    annual_yield_pct: Optional[float] = None
    liquidity_days: Optional[int] = None
    penalty_pct: Optional[float] = None
    tax_haircut_pct: Optional[float] = None
    liquidation_order: Optional[int] = None


class AssetOut(AssetBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Transaction Schemas ---
class TransactionBase(BaseModel):
    date: datetime
    description: str
    amount: float
    category: ExpenseCategoryEnum = ExpenseCategoryEnum.ESSENTIAL
    is_income: bool = False
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    source_account: Optional[str] = None
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class IngestionSummary(BaseModel):
    total_parsed: int
    inserted: int
    anomalies_detected: int
    total_income: float
    total_expenses: float
