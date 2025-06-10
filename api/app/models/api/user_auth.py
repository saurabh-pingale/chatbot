from pydantic import BaseModel, EmailStr

class SendOTPRequest(BaseModel):
    email: EmailStr
    shop_id: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    shop_id: str 