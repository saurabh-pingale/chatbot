from pydantic import BaseModel

class CheckoutRequest(BaseModel):
    plan: str
    shop_domain: str

class ContactRequest(BaseModel):
    shop_domain: str

