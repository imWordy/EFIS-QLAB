import re
from typing import Tuple, Dict, Any, List
from app.models.entities import ExpenseCategoryEnum


# Curated semantic knowledge base for transaction recognition
ESSENTIAL_PATTERNS = [
    r"\b(rent|lease|mortgage|landlord|housing)\b",
    r"\b(electric|power|energy|water|sewer|utility|utilities|gas\s+bill)\b",
    r"\b(grocer|supermarket|walmart|costco|trader\s+joe|kroger|safeway|aldi|target\s+pantry)\b",
    r"\b(health|hospital|clinic|doctor|pharmacy|walgreens|cvs|medicine|meds|prescription)\b",
    r"\b(insurance|geico|state\s+farm|progressive|allstate|prudential|aetna)\b",
    r"\b(loan|emi|mortgage|interest|auto\s+loan|student\s+loan|debt)\b",
    r"\b(internet|wifi|broadband|comcast|verizon|at&t|t-mobile|spectrum)\b",
    r"\b(tuition|school|daycare|kindergarten|education)\b",
    r"\b(fuel|petrol|diesel|gasoline|metro|subway|bus\s+pass|commute)\b"
]

FLEXIBLE_PATTERNS = [
    r"\b(restaurant|dining|bistro|cafe|coffee|starbucks|dunkin|chipotle|mcdonalds|burger|pizza|sushi)\b",
    r"\b(bar|pub|brewery|wine|liquor|cocktail|nightclub)\b",
    r"\b(netflix|spotify|hulu|disney\+|hbo|youtube\s+premium|apple\s+tv|prime\s+video)\b",
    r"\b(cinema|theater|concert|ticketmaster|amc|movie)\b",
    r"\b(shopping|amazon|zara|h&m|nike|adidas|fashion|clothing|apparel|luxury|sephora)\b",
    r"\b(vacation|flight|airline|airbnb|hotel|resort|booking\.com|travel|expedia)\b",
    r"\b(gym|fitness|crossfit|equinox|peloton)\b",
    r"\b(game|steam|playstation|xbox|nintendo)\b"
]


class EnsembleClassifier:
    """
    Ensemble Expense Categorizer combining high-precision regex heuristic rules,
    rigidity weighting, and statistical elasticity calculations.
    """

    @classmethod
    def classify_transaction(cls, description: str, amount: float) -> Tuple[ExpenseCategoryEnum, float, str]:
        """
        Returns:
            Tuple of (Category, Confidence Score 0.0-1.0, Matched Feature)
        """
        clean_text = description.lower().strip()

        # 1. Regex Pattern Matching
        for pattern in ESSENTIAL_PATTERNS:
            match = re.search(pattern, clean_text)
            if match:
                return ExpenseCategoryEnum.ESSENTIAL, 0.95, f"Rule match: {match.group(0)}"

        for pattern in FLEXIBLE_PATTERNS:
            match = re.search(pattern, clean_text)
            if match:
                return ExpenseCategoryEnum.FLEXIBLE, 0.92, f"Rule match: {match.group(0)}"

        # 2. Heuristic fallback based on ticket size (Conservative financial prudence)
        # Large untracked recurring payments tend to be fixed bills, small odd amounts tend to be discretionary
        if amount > 500.0:
            return ExpenseCategoryEnum.ESSENTIAL, 0.65, "Heuristic: High-value expense defaults to essential"
        else:
            return ExpenseCategoryEnum.FLEXIBLE, 0.60, "Heuristic: Low-value discretionary default"

    @classmethod
    def calculate_rigidity(cls, essential_sum: float, flexible_sum: float) -> Dict[str, Any]:
        """
        Calculates Expense Rigidity Score:
        Rigidity % = (Essential Expenses / Total Expenses) * 100
        A high rigidity score (>75%) signals high risk during an income shock
        because the user has little discretionary spending to cut.
        """
        total = essential_sum + flexible_sum
        if total <= 0:
            return {
                "rigidity_score": 0.0,
                "elasticity_score": 100.0,
                "risk_tier": "UNKNOWN",
                "interpretation": "Insufficient spending history to compute rigidity."
            }

        rigidity_score = round((essential_sum / total) * 100.0, 2)
        elasticity_score = round(100.0 - rigidity_score, 2)

        if rigidity_score >= 80.0:
            risk_tier = "CRITICAL"
            interpretation = "Ultra-rigid budget. Very low elasticity. Cuts during emergencies will require lifestyle distress."
        elif rigidity_score >= 60.0:
            risk_tier = "MODERATE"
            interpretation = "Balanced budget. Capable of moderate spending deflation under stress."
        else:
            risk_tier = "FLEXIBLE"
            interpretation = "Highly elastic budget. Significant discretionary padding that can easily be suspended during emergencies."

        return {
            "rigidity_score": rigidity_score,
            "elasticity_score": elasticity_score,
            "risk_tier": risk_tier,
            "interpretation": interpretation
        }
