from pydantic import BaseModel
from typing import List, Dict, Any

class AgentRouterResponse(BaseModel):
    answer: str
    products: List[Dict[str, Any]] = []
    categories: List[str] = []

class ErrorResponse(BaseModel):
    detail: str

class FeedbackHistory(BaseModel):
    agent: str
    quality_score: float
    feedback: str
    timestamp: str
    attempt: int

