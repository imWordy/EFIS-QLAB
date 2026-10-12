from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np
from app.models.entities import Asset, AssetTierEnum


@dataclass
class LiquidatedAssetSummary:
    asset_id: str
    asset_name: str
    tier: str
    original_balance: float
    liquidated_amount: float
    remaining_balance: float
    penalty_incurred: float
    tax_incurred: float
    net_cash_realized: float


class LiquidityCascadeEngine:
    """
    Multi-Tier Liquidity Cascade Engine.
    Draws funds from user's assets according to priority order:
    Tier 1 (Cash / Checking) -> Tier 2 (High-Yield Savings) -> Tier 3 (Fixed Deposits with penalty)
    -> Tier 4 (Liquid Mutual Funds with STCG tax haircut) -> Tier 5 (Equity / Drawdown) -> Tier 6 (Credit Line)
    """

    @classmethod
    def execute_liquidation_step(
        cls,
        assets: List[Dict[str, Any]],
        cash_needed: float
    ) -> Dict[str, Any]:
        """
        Takes list of asset dictionaries and the required cash deficit for the period.
        Liquidates assets progressively, accounting for penalties and tax haircuts.
        """
        sorted_assets = sorted(assets, key=lambda a: a.get("liquidation_order", 999))
        remaining_deficit = cash_needed
        total_penalties = 0.0
        total_taxes = 0.0
        liquidated_steps: List[LiquidatedAssetSummary] = []

        updated_assets = []
        for a in sorted_assets:
            bal = float(a.get("amount", 0.0))
            if remaining_deficit <= 0 or bal <= 0:
                updated_assets.append(a)
                continue

            penalty_pct = float(a.get("penalty_pct", 0.0)) / 100.0
            tax_pct = float(a.get("tax_haircut_pct", 0.0)) / 100.0
            effective_friction = penalty_pct + tax_pct
            retention_rate = max(1.0 - effective_friction, 0.01)

            # Max net cash this asset can yield
            max_net_cash = bal * retention_rate

            if max_net_cash <= remaining_deficit:
                gross_withdrawn = bal
                penalty = gross_withdrawn * penalty_pct
                tax = gross_withdrawn * tax_pct
                net_yield = max_net_cash
                rem_bal = 0.0
                remaining_deficit -= net_yield
            else:
                gross_withdrawn = remaining_deficit / retention_rate
                penalty = gross_withdrawn * penalty_pct
                tax = gross_withdrawn * tax_pct
                net_yield = remaining_deficit
                rem_bal = bal - gross_withdrawn
                remaining_deficit = 0.0

            total_penalties += penalty
            total_taxes += tax

            liquidated_steps.append({
                "asset_id": str(a.get("id", "")),
                "asset_name": str(a.get("name", "Unnamed Asset")),
                "tier": str(a.get("tier", "CASH")),
                "original_balance": round(bal, 2),
                "liquidated_amount": round(gross_withdrawn, 2),
                "remaining_balance": round(rem_bal, 2),
                "penalty_incurred": round(penalty, 2),
                "tax_incurred": round(tax, 2),
                "net_cash_realized": round(net_yield, 2)
            })


            a_copy = dict(a)
            a_copy["amount"] = rem_bal
            updated_assets.append(a_copy)

        return {
            "deficit_remaining": max(round(remaining_deficit, 2), 0.0),
            "is_exhausted": remaining_deficit > 0,
            "total_penalties": round(total_penalties, 2),
            "total_taxes": round(total_taxes, 2),
            "liquidations": liquidated_steps,
            "remaining_assets": updated_assets,
            "total_liquid_remaining": round(sum(a["amount"] for a in updated_assets), 2)
        }
