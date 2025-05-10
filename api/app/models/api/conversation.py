from typing import List
from pydantic import BaseModel
from datetime import datetime

class ConversationMessage(BaseModel):
    user_query: str
    agent_response: str
    
class ConversationRequest(BaseModel):
    user_query: str
    agent_response: str
    user_id: int
    shop_id: int
    
class ConversationResponse(BaseModel):
    id: int
    user_query: str
    agent_response: str
    created_at: datetime
    user_id: int
    shop_id: int
    
class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    
class ErrorResponse(BaseModel):
    detail: str