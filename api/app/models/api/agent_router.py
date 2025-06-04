from pydantic import BaseModel
from typing import List, Dict, Any
from pydantic import BaseModel, Field

class AgentRouterResponse(BaseModel):
    answer: str
    products: List[Dict[str, Any]] = []
    categories: List[str] = Field(default_factory=list)
    history: List[Dict] = [] 

class ErrorResponse(BaseModel):
    detail: str