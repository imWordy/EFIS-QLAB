import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssetTierEnum(str, enum.Enum):
    CASH = "CASH"                           # Immediate (Checking, Physical Cash)
    HIGH_YIELD = "HIGH_YIELD"               # 24hr access, High Yield Savings
    FIXED_DEPOSIT = "FIXED_DEPOSIT"         # Fixed Deposit / Term Deposit (has break penalty)
    LIQUID_MUTUAL_FUND = "LIQUID_MUTUAL_FUND" # T+1 or T+2, debt fund / liquid fund
    EQUITY = "EQUITY"                       # Liquid stock/equity (drawdown risk, STCG tax)
    CREDIT_LINE = "CREDIT_LINE"             # Backup emergency overdraft / card limit


class ExpenseCategoryEnum(str, enum.Enum):
    ESSENTIAL = "ESSENTIAL"                 # Rent, basic groceries, utilities, debt minimums
    FLEXIBLE = "FLEXIBLE"                   # Dining out, entertainment, shopping
    SHOCK_OUTLIER = "SHOCK_OUTLIER"         # Detected anomaly (medical event, one-off purchase)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    base_currency = Column(String(10), default="USD")
    target_survival_months = Column(Integer, default=6)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    tier = Column(SQLEnum(AssetTierEnum), default=AssetTierEnum.CASH, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    annual_yield_pct = Column(Float, default=0.0)  # e.g. 5.5 for 5.5%
    liquidity_days = Column(Integer, default=0)    # Days required to convert to cash
    penalty_pct = Column(Float, default=0.0)       # Early withdrawal fee/haircut %
    tax_haircut_pct = Column(Float, default=0.0)   # Estimated capital gains tax %
    liquidation_order = Column(Integer, default=1) # 1 = first to liquidate
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="assets")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)          # Positive = Expense, Negative = Income/Credit
    category = Column(SQLEnum(ExpenseCategoryEnum), default=ExpenseCategoryEnum.ESSENTIAL, nullable=False)
    is_income = Column(Boolean, default=False)
    is_anomaly = Column(Boolean, default=False)
    anomaly_reason = Column(String(255), nullable=True)
    source_account = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
