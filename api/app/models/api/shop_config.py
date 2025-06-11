from typing import Optional
from pydantic import BaseModel

class ShopConfigResponse(BaseModel):
    preferred_color: Optional[str]
    image: Optional[str]
    setup_completed: bool
    plan: str
    show_email_gate: Optional[bool]