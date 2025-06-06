from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AgentRouterResponse(BaseModel):
    answer: str
    products: List[Dict[str, Any]] = []
    categories: List[str] = Field(default_factory=list)
    history: List[Dict] = [] 

class ErrorResponse(BaseModel):
    detail: str

class LocationInfo(BaseModel):
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    ip: Optional[str] = None

class AgentConversationPayload(BaseModel):
    messages: List[Dict[str, Any]]
    token: str
    location_info: Optional[LocationInfo] = None