from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict
from datetime import datetime, timedelta
import random

from app.dbhandlers.otp_handler import OTPHandler
from app.dbhandlers.user_handler import UserHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.email_utils import send_otp_email
from app.utils.jwt_utils import create_access_token
from app.utils.logger import logger
from app.models.api.user_auth import SendOTPRequest, VerifyOTPRequest

user_auth_router = APIRouter(prefix="/user_auth", tags=["user_auth"])

otp_handler = OTPHandler()
user_handler = UserHandler()
shop_admin_handler = ShopAdminHandler()

@user_auth_router.post("/send-otp", summary="Send OTP to user's email")
async def send_otp(payload: SendOTPRequest):
    try:
        shop = await shop_admin_handler.get_shop_by_domain(payload.shop_id)
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

        otp = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        await otp_handler.store_otp(email=payload.email, otp=otp, expires_at=expires_at)
        await send_otp_email(to_email=payload.email, otp=otp)

        return {"message": "OTP sent successfully"}
    except Exception as e:
        logger.error(f"Error sending OTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@user_auth_router.post("/verify-otp", summary="Verify OTP and return JWT token")
async def verify_otp(payload: VerifyOTPRequest) -> Dict[str, str]:
    try:
        shop = await shop_admin_handler.get_shop_by_domain(payload.shop_id)
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

        stored_otp = await otp_handler.get_otp_by_email(email=payload.email)

        if not stored_otp or stored_otp.otp != payload.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        if datetime.utcnow() > stored_otp.expires_at:
            await otp_handler.delete_otp(email=payload.email)
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        user = await user_handler.get_user_by_email_and_shop_id(email=payload.email, shop_id=shop.id)
        if not user:
            user = await user_handler.create_user(email=payload.email, shop_id=shop.id)

        await otp_handler.delete_otp(email=payload.email)

        token_data = {"user_id": user.id, "shop_id": user.shop_id}
        access_token = create_access_token(data=token_data)

        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify OTP") 