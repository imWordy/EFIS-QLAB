from pydantic import BaseModel
from typing import Optional, Dict, Any


class AdviceRequest(BaseModel):
    user_question: Optional[str] = None
    custom_simulation_params: Optional[Dict[str, Any]] = None


class ScenarioRunRequest(BaseModel):
    scenario_id: str
    target_survival_months: Optional[int] = 12
