from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from app.models.entities import Transaction, ExpenseCategoryEnum


class AnomalyReviewService:
    """
    Advanced Outlier Detection & Anomaly Review Service.
    Instead of silently discarding shocks, EFIS 2.0 flags anomalies
    and provides a Human-in-the-Loop review API to classify them as:
    - ONE_TIME_SHOCK (isolated event, removed from baseline runway burn)
    - NEW_BASELINE (permanent price increase, added to recurring forecast)
    - AMORTIZED_EXPENSE (annual expense like insurance, spread across 12 months)
    """

    @staticmethod
    def detect_outliers_statistical(transactions: List[Transaction], z_threshold: float = 2.5) -> List[Dict[str, Any]]:
        """
        Modified Z-score / IQR hybrid outlier detector.
        Identifies uncharacteristically large expenditures that skew monthly emergency burn.
        """
        expenses = [t for t in transactions if not t.is_income and t.amount > 0]
        if len(expenses) < 5:
            return []

        amounts = np.array([t.amount for t in expenses])
        median = np.median(amounts)
        diff = np.abs(amounts - median)
        med_abs_dev = np.median(diff)

        # Modified Z-score avoids bias from huge single outliers
        mod_z_scores = 0.6745 * diff / (med_abs_dev if med_abs_dev > 0 else 1.0)

        flagged = []
        for i, tx in enumerate(expenses):
            if mod_z_scores[i] >= z_threshold and tx.amount > 500.0:
                flagged.append({
                    "transaction_id": tx.id,
                    "date": tx.date.isoformat(),
                    "description": tx.description,
                    "amount": tx.amount,
                    "modified_z_score": round(float(mod_z_scores[i]), 2),
                    "suggested_action": "Mark as ONE_TIME_SHOCK to avoid artificially inflating required emergency fund size.",
                    "status": "PENDING_REVIEW"
                })

        return flagged
