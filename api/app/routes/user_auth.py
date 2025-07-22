import random
from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime, timedelta, UTC

from app.models.api.user_auth import SendOTPRequest, VerifyOTPRequest
from app.utils.app_utils import get_app
from app.utils.email_utils import send_otp_email
from app.utils.jwt_utils import create_access_token
from app.utils.logger import logger

user_auth_router = APIRouter(prefix="/user_auth", tags=["user_auth"])

@user_auth_router.post("/send-otp", summary="Send OTP to user's email")
async def send_otp(payload: SendOTPRequest):
    try:
        app = get_app()
        shop = await app.analytics_handler.get_shop_pk(payload.shop_id)
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

        otp = str(random.randint(1000, 9999))
        expired_at = datetime.now(UTC) + timedelta(minutes=5)

        await app.otp_handler.store_otp(email=payload.email, otp=otp, expired_at=expired_at)
        await send_otp_email(to_email=payload.email, otp=otp, shop_domain=payload.shop_id)

        return {"message": "OTP sent successfully"}
    except Exception as e:
        logger.error(f"Error sending OTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@user_auth_router.post("/verify-otp", summary="Verify OTP and return JWT token")
async def verify_otp(payload: VerifyOTPRequest) -> Dict[str, str]:
    try:
        app = get_app()
        shop_id = await app.analytics_handler.get_shop_pk(payload.shop_id)
        if not shop_id:
            raise HTTPException(status_code=404, detail="Shop not found")

        stored_otp = await app.otp_handler.get_otp_by_email(email=payload.email)

        if not stored_otp or stored_otp != payload.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        user = await app.user_handler.get_user_by_email_and_shop_id(email=payload.email, shop_id=shop_id)
        if not user:
            user = await app.user_handler.create_user(email=payload.email, shop_id=shop_id)

        token_data = {"user_id": user.id, "shop_id": user.shop_id}
        access_token = create_access_token(data=token_data)

        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify OTP") 