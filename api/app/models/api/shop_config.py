from typing import Optional, List
from pydantic import BaseModel

class ShopConfigResponse(BaseModel):
    preferred_color: Optional[str]
    image: Optional[str]
    setup_completed: bool
    plan: str
    show_email_gate: Optional[bool]
    support_email: Optional[str]
    support_phone: Optional[str]
    support_country_code: Optional[str]
    quick_replies: Optional[List[str]] = []

class StoreAccessTokenRequest(BaseModel):
    access_token: str