import io
import pandas as pd
from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import Transaction, ExpenseCategoryEnum
from app.schemas.dtos import IngestionSummary


ESSENTIAL_KEYWORDS = [
    "rent", "mortgage", "electric", "power", "water", "utility", "gas",
    "groceries", "supermarket", "health", "hospital", "pharmacy", "medicine",
    "insurance", "loan", "emi", "tax", "tuition", "internet", "wifi"
]

FLEXIBLE_KEYWORDS = [
    "restaurant", "cafe", "coffee", "starbucks", "bar", "pub", "netflix",
    "spotify", "cinema", "movie", "shopping", "amazon", "clothes", "zara",
    "vacation", "flight", "hotel", "game", "steam", "luxury"
]


class IngestionService:
    @staticmethod
    def classify_description(desc: str) -> ExpenseCategoryEnum:
        lower_desc = desc.lower()
        for kw in ESSENTIAL_KEYWORDS:
            if kw in lower_desc:
                return ExpenseCategoryEnum.ESSENTIAL
        for kw in FLEXIBLE_KEYWORDS:
            if kw in lower_desc:
                return ExpenseCategoryEnum.FLEXIBLE
        return ExpenseCategoryEnum.ESSENTIAL  # Conservative default for safety

    @classmethod
    async def process_csv_content(cls, file_bytes: bytes, user_id: str, db: AsyncSession) -> IngestionSummary:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Unable to parse CSV file: {str(e)}")

        # Normalize column names
        df.columns = [c.strip().lower() for c in df.columns]

        # Check required columns
        date_col = next((c for c in df.columns if "date" in c), None)
        desc_col = next((c for c in df.columns if any(k in c for k in ["desc", "merchant", "narrat", "detail", "name"])), None)
        amount_col = next((c for c in df.columns if any(k in c for k in ["amount", "debit", "val", "price", "sum"])), None)

        if not (date_col and desc_col and amount_col):
            raise ValueError(f"CSV must contain date, description, and amount columns. Found: {list(df.columns)}")

        # Clean amounts
        def clean_val(val):
            if pd.isna(val):
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            cleaned = str(val).replace("$", "").replace("₹", "").replace("€", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0

        df["clean_amount"] = df[amount_col].apply(clean_val)
        df["clean_date"] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=["clean_date"])

        # Basic statistical outlier detection (threshold > mean + 3*std for positive expenses)
        expense_mask = df["clean_amount"] > 0
        mean_exp = df.loc[expense_mask, "clean_amount"].mean() if expense_mask.any() else 0.0
        std_exp = df.loc[expense_mask, "clean_amount"].std() if expense_mask.any() else 0.0
        outlier_threshold = (mean_exp + 3 * std_exp) if std_exp > 0 else (mean_exp * 4)

        created_transactions = []
        total_income = 0.0
        total_expenses = 0.0
        anomalies_count = 0

        for _, row in df.iterrows():
            amt = float(row["clean_amount"])
            desc = str(row[desc_col]).strip()
            date_val = row["clean_date"].to_pydatetime()
            if date_val.tzinfo is None:
                date_val = date_val.replace(tzinfo=timezone.utc)

            # Negative amount or income indicators
            is_income = False
            if "type" in df.columns and "credit" in str(row.get("type", "")).lower():
                is_income = True
                total_income += abs(amt)
            elif amt < 0:
                is_income = True
                amt = abs(amt)
                total_income += amt
            else:
                total_expenses += amt

            is_anomaly = False
            anomaly_reason = None
            if not is_income and amt > outlier_threshold and amt > 1000.0:
                is_anomaly = True
                anomaly_reason = f"Statistical shock: amount ${amt:.2f} significantly exceeds normal baseline."
                anomalies_count += 1

            cat = ExpenseCategoryEnum.SHOCK_OUTLIER if is_anomaly else cls.classify_description(desc)

            tx = Transaction(
                user_id=user_id,
                date=date_val,
                description=desc,
                amount=amt,
                category=cat,
                is_income=is_income,
                is_anomaly=is_anomaly,
                anomaly_reason=anomaly_reason,
                source_account=row.get("account", "Standard Upload")
            )
            created_transactions.append(tx)

        # Batch insert
        db.add_all(created_transactions)
        await db.commit()

        return IngestionSummary(
            total_parsed=len(df),
            inserted=len(created_transactions),
            anomalies_detected=anomalies_count,
            total_income=total_income,
            total_expenses=total_expenses
        )
