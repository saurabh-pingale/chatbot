from pydantic import BaseModel
from typing import Optional

class CartRequestParams(BaseModel):
    shop_id: str
    guest_id:str

class CartItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: int
    price: float
    name: str
    image_url: Optional[str]
    variant_quantity: int

    class Config:
        from_attributes = True