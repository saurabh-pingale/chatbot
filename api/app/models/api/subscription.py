from pydantic import BaseModel, EmailStr

class CheckoutRequest(BaseModel):
    plan: str
    shop_domain: str

class ContactRequest(BaseModel):
    shop_domain: str

class EarlyPlusRequest(BaseModel):
    plan: str
    shop_domain: str
    email: EmailStr

class TrialRequest(BaseModel):
    shop_domain: str