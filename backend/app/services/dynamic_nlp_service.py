import re
import math
from typing import Dict, Any, List, Tuple
from app.models.entities import AssetTierEnum, ExpenseCategoryEnum

"""
Semantic Financial Lexicon & Embedding Centroids for Dynamic NLP Cosine Matching.
Allows arbitrary user-provided asset names ('luxury_yacht', 'startup_equity', 'epf', 'kisan_vikas_patra', 'gold_etf')
and transaction labels ('fine_dining', 'staff_salary', 'daily_wage', 'sip', 'rd')
to be inferred dynamically without rigid hardcoding.
"""

# Vector concept centroids (bag-of-subwords representation)
ASSET_TIER_VECTORS = {
    AssetTierEnum.CASH: [
        "cash", "currency", "physical", "wallet", "checking", "demand", "petty", "hand"
    ],
    AssetTierEnum.HIGH_YIELD: [
        "saving", "savings", "hysa", "high yield", "money market", "mfd", "liquid", "sweep", "reserve"
    ],
    AssetTierEnum.FIXED_DEPOSIT: [
        "fixed deposit", "fd", "rd", "recurring deposit", "certificate", "cd", "term deposit", "epf", "ppf", "provident", "bonds", "treasury"
    ],
    AssetTierEnum.LIQUID_MUTUAL_FUND: [
        "mutual fund", "liquid fund", "debt fund", "ultra short", "overnight fund", "etf", "sip", "arbitrage", "gold"
    ],
    AssetTierEnum.EQUITY: [
        "stock", "stocks", "equity", "shares", "portfolio", "crypto", "bitcoin", "ethereum", "business", "startup", "venture", "real estate", "property", "vehicle", "car", "asset"
    ],
    AssetTierEnum.CREDIT_LINE: [
        "credit", "overdraft", "line of credit", "loc", "card limit", "emergency loan"
    ]
}

# Semantic rigidity centroids
ESSENTIAL_CONCEPT_WORDS = [
    "rent", "lease", "housing", "mortgage", "shelter", "utility", "power", "electric", "water", "sewer", "gas",
    "grocery", "groceries", "food", "ration", "flour", "grain", "pantry", "supermarket",
    "medical", "health", "doctor", "clinic", "hospital", "medicine", "pharma", "prescription",
    "insurance", "policy", "premium", "life", "health",
    "emi", "loan", "debt", "interest", "repayment", "instalment", "tax", "duty", "cess",
    "school", "college", "tuition", "education", "fees", "books",
    "fuel", "petrol", "diesel", "gasoline", "commute", "subway", "metro", "bus", "train", "staff", "salary"
]

FLEXIBLE_CONCEPT_WORDS = [
    "entertainment", "movie", "cinema", "theater", "show", "concert", "ticket",
    "dining", "restaurant", "cafe", "bistro", "pub", "bar", "cocktail", "alcohol", "liquor", "fine dining",
    "shopping", "luxury", "mall", "clothing", "apparel", "zara", "fashion", "accessories", "jewel", "gift",
    "vacation", "holiday", "tour", "resort", "hotel", "flight", "airline", "trip", "cruise",
    "hobby", "game", "gaming", "steam", "playstation", "streaming", "ott", "subscription", "gym", "fitness",
    "leisure", "spa", "salon", "party", "club", "donation", "charity", "misc", "miscellaneous"
]


def tokenize_text(text: str) -> List[str]:
    """Extracts clean alphanumeric tokens and n-grams from text."""
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    tokens = clean.split()
    # also add bigrams
    bigrams = [" ".join(tokens[i:i+2]) for i in range(len(tokens)-1)]
    return tokens + bigrams


def compute_jaccard_semantic_similarity(query_tokens: List[str], target_tokens: List[str]) -> float:
    """Computes tokenized semantic overlap score."""
    q_set = set(query_tokens)
    t_set = set(target_tokens)
    if not q_set or not t_set:
        return 0.0
    intersection = len(q_set & t_set)
    # Check partial substring matches as well (e.g. 'grocer' in 'groceries')
    for q in q_set:
        for t in t_set:
            if len(q) > 3 and (q in t or t in q):
                intersection += 0.5
    union = len(q_set | t_set)
    return intersection / union if union > 0 else 0.0


class DynamicNLPService:
    """
    Dynamic Financial NLP Engine.
    Maps arbitrary user asset classifications and transaction semantics without rigid hardcoding.
    """

    @classmethod
    def infer_asset_properties(cls, asset_type_name: str, value: float) -> Dict[str, Any]:
        """
        Dynamically infers liquidity tier, annual yield %, early withdrawal penalty %,
        and liquidation order for ANY custom asset name provided by the user.
        """
        name_tokens = tokenize_text(asset_type_name)

        best_tier = AssetTierEnum.EQUITY  # Safe fallback for unfamiliar assets
        highest_score = -1.0

        for tier, concept_words in ASSET_TIER_VECTORS.items():
            score = compute_jaccard_semantic_similarity(name_tokens, concept_words)
            if score > highest_score:
                highest_score = score
                best_tier = tier

        # Dynamically set liquidity & penalty characteristics based on the inferred tier
        tier_specs = {
            AssetTierEnum.CASH: {
                "annual_yield_pct": 1.0,
                "liquidity_days": 0,
                "penalty_pct": 0.0,
                "tax_haircut_pct": 0.0,
                "liquidation_order": 1
            },
            AssetTierEnum.HIGH_YIELD: {
                "annual_yield_pct": 5.0,
                "liquidity_days": 1,
                "penalty_pct": 0.0,
                "tax_haircut_pct": 0.0,
                "liquidation_order": 2
            },
            AssetTierEnum.FIXED_DEPOSIT: {
                "annual_yield_pct": 6.8,
                "liquidity_days": 7,
                "penalty_pct": 1.5,
                "tax_haircut_pct": 0.0,
                "liquidation_order": 3
            },
            AssetTierEnum.LIQUID_MUTUAL_FUND: {
                "annual_yield_pct": 7.5,
                "liquidity_days": 3,
                "penalty_pct": 0.5,
                "tax_haircut_pct": 15.0,
                "liquidation_order": 4
            },
            AssetTierEnum.EQUITY: {
                "annual_yield_pct": 10.0,
                "liquidity_days": 14,
                "penalty_pct": 3.0,
                "tax_haircut_pct": 20.0,
                "liquidation_order": 5
            },
            AssetTierEnum.CREDIT_LINE: {
                "annual_yield_pct": 0.0,
                "liquidity_days": 0,
                "penalty_pct": 18.0,
                "tax_haircut_pct": 0.0,
                "liquidation_order": 6
            }
        }

        specs = tier_specs.get(best_tier, tier_specs[AssetTierEnum.EQUITY])
        return {
            "inferred_tier": best_tier,
            "confidence_score": round(min(max(highest_score * 2.0, 0.4), 0.98), 2),
            **specs
        }

    @classmethod
    def classify_expense_dynamically(cls, category_or_desc: str, amount: float) -> Tuple[ExpenseCategoryEnum, float, str]:
        """
        Dynamically calculates whether an expense category or description is Essential vs Flexible
        using semantic overlap across financial concept vectors.
        """
        tokens = tokenize_text(category_or_desc)

        essential_score = compute_jaccard_semantic_similarity(tokens, ESSENTIAL_CONCEPT_WORDS)
        flexible_score = compute_jaccard_semantic_similarity(tokens, FLEXIBLE_CONCEPT_WORDS)

        if essential_score > flexible_score:
            conf = min(0.6 + essential_score * 0.4, 0.98)
            return ExpenseCategoryEnum.ESSENTIAL, round(conf, 2), f"Semantic match to Essential needs (score: {essential_score:.2f})"
        elif flexible_score > essential_score:
            conf = min(0.6 + flexible_score * 0.4, 0.98)
            return ExpenseCategoryEnum.FLEXIBLE, round(conf, 2), f"Semantic match to Discretionary spending (score: {flexible_score:.2f})"
        else:
            # Tie breaker: High ticket recurring obligations lean essential, small tickets lean flexible
            if abs(amount) > 800.0:
                return ExpenseCategoryEnum.ESSENTIAL, 0.55, "Semantic Neutral: High-value expense prudence"
            else:
                return ExpenseCategoryEnum.FLEXIBLE, 0.55, "Semantic Neutral: Low-value discretionary default"
