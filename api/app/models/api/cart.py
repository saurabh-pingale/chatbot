from pydantic import BaseModel

class CartRequestParams(BaseModel):
    shop_id: str
    guest_id:str