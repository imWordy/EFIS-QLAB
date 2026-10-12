from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings


# Domain-specific financial resilience rules and heuristics for offline advice
KNOWLEDGE_BASE = [
    {
        "topic": "liquidity_velocity",
        "rule": "Keep at least 1-2 months of living costs in immediate Tier 1 Cash (checking/savings) before locking funds into term deposits or mutual funds."
    },
    {
        "topic": "rigidity_management",
        "rule": "If your Budget Rigidity exceeds 75%, prioritize renegotiating fixed commitments (rent, high-interest debt, subscription tiers) to introduce elasticity."
    },
    {
        "topic": "panic_deflation",
        "rule": "Triggering lifestyle deflation (cutting discretionary expenses by 50-80%) when runway falls below 3 months can extend your total survival by an additional 1.5 to 3 months."
    },
    {
        "topic": "tax_and_penalty",
        "rule": "Breaking fixed deposits early incurs a 1-2% interest penalty, while liquidating mutual funds can trigger short-term capital gains tax. Liquidate zero-friction assets first."
    }
]


class AgenticAdvisorService:
    """
    Local AI Financial Resilience Advisor.
    Integrates user's real balance sheet, Monte Carlo percentile results,
    and domain knowledge to synthesize contextual guidance.
    Connects to local Ollama if available, with robust deterministic synthesis fallback.
    """

    @classmethod
    async def generate_advice(
        cls,
        user_context: Dict[str, Any],
        simulation_results: Dict[str, Any],
        user_question: Optional[str] = None,
        ollama_base_url: str = "http://localhost:11434",
        model_name: str = "llama3:latest"
    ) -> Dict[str, Any]:
        """
        Synthesizes advice through local LLM or fallback expert rules.
        """
        rigidity = user_context.get("rigidity_score", 65.0)
        total_assets = user_context.get("total_liquid_assets", 0.0)
        prob_survival = simulation_results.get("prob_surviving_target", 0.0)
        median_survival = simulation_results.get("median_survival_months", 0.0)
        worst_survival = simulation_results.get("worst_case_survival_months", 0.0)
        shortfall = simulation_results.get("capital_shortfall", 0.0)

        prompt = (
            f"You are EFIS 2.0 AI Advisor, an expert in financial resilience, liquidity risk, and stress testing.\n"
            f"User Profile & Simulation Context:\n"
            f"- Liquid Reserve: ${total_assets:,.2f}\n"
            f"- Budget Rigidity: {rigidity}%\n"
            f"- Target Survival Probability: {prob_survival}%\n"
            f"- Median Survival Runway: {median_survival} months\n"
            f"- Worst-Case Stress Runway (p10): {worst_survival} months\n"
            f"- Capital Shortfall for 95% Confidence: ${shortfall:,.2f}\n"
            f"- Specific Inquiry: {user_question or 'Provide an overall resilience assessment and 3 prioritized actions.'}\n\n"
            f"Provide an actionable, structured, and realistic resilience recommendation."
        )

        # Attempt to reach local Ollama
        ai_response_text = None
        engine_mode = "DETERMINISTIC_RULES_ENGINE"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{ollama_base_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                if res.status_code == 200:
                    ai_response_text = res.json().get("response")
                    engine_mode = f"LOCAL_LLM ({model_name})"
        except Exception:
            # Local Ollama offline or timed out; fall back to deterministic expert synthesis
            pass

        if not ai_response_text:
            # Expert deterministic rule-based advice synthesis
            recommendations = []
            if prob_survival >= 90.0:
                verdict = "EXCELLENT RESILIENCE"
                summary = f"Your emergency fund exhibits exceptional resilience with a {prob_survival}% survival probability against this crisis. Your worst-case runway covers {worst_survival} months."
            elif prob_survival >= 70.0:
                verdict = "MODERATE RESILIENCE"
                summary = f"Your survival probability is {prob_survival}%. While your median runway is {median_survival} months, severe macro stress (p10) drops your runway to {worst_survival} months."
            else:
                verdict = "CRITICAL RESILIENCE VULNERABILITY"
                summary = f"Under simulated crisis conditions, your survival probability drops to {prob_survival}%. You face a projected reserve shortfall of ${shortfall:,.2f} to guarantee full survival."

            if shortfall > 0:
                recommendations.append(f"Target Reserve Top-Up: Allocate surplus cashflow to bridge your ${shortfall:,.2f} reserve gap.")
            if rigidity > 75.0:
                recommendations.append(f"De-Rigidify Spending: Your fixed obligations ({rigidity}% of budget) leave minimal room for lifestyle deflation. Consider refinancing loans or reducing recurring overhead.")
            else:
                recommendations.append(f"Leverage Elasticity: Your low rigidity score gives you high spending elasticity. Preparing to reduce flexible expenditures immediately upon shock will stretch runway by 2-3 months.")
            recommendations.append("Tier-1 Liquidity Protection: Ensure at least 60 days of living costs sit in zero-penalty instant access accounts before locking funds into term deposits.")

            ai_response_text = (
                f"### Resilience Assessment: {verdict}\n\n"
                f"{summary}\n\n"
                f"**Prioritized Action Plan:**\n" +
                "\n".join([f"{i+1}. {r}" for i, r in enumerate(recommendations)])
            )

        return {
            "engine": engine_mode,
            "verdict": "ANALYSIS_COMPLETE",
            "summary": ai_response_text,
            "key_metrics": {
                "survival_probability": prob_survival,
                "median_runway": median_survival,
                "worst_case_runway": worst_survival,
                "capital_shortfall": shortfall,
                "rigidity_score": rigidity
            }
        }
