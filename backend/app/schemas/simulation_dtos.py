from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class SimulationRequest(BaseModel):
    crisis_duration_months: int = Field(default=6, ge=1, le=36)
    income_retention_pct: float = Field(default=0.0, ge=0.0, le=100.0) # 0% = full job loss
    inflation_rate_pct: float = Field(default=4.0, ge=0.0, le=25.0)
    investment_yield_pct: float = Field(default=4.5, ge=0.0, le=20.0)
    target_survival_months: int = Field(default=12, ge=3, le=60)
    num_simulations: int = Field(default=5000, ge=500, le=20000)
    max_deflation_pct: float = Field(default=80.0, ge=0.0, le=100.0)
    panic_runway_threshold_months: float = Field(default=3.0, ge=1.0, le=12.0)


class LiquidationRequest(BaseModel):
    cash_needed: float = Field(..., ge=0.0)


class LiquidationStepOut(BaseModel):
    asset_id: str
    asset_name: str
    tier: str
    original_balance: float
    liquidated_amount: float
    remaining_balance: float
    penalty_incurred: float
    tax_incurred: float
    net_cash_realized: float


class LiquidationResponse(BaseModel):
    deficit_remaining: float
    is_exhausted: bool
    total_penalties: float
    total_taxes: float
    liquidations: List[LiquidationStepOut]
    total_liquid_remaining: float
