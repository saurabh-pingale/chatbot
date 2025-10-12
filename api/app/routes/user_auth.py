import random
import asyncio
from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime, timedelta, UTC

from app.models.api.user_auth import SendOTPRequest, VerifyOTPRequest
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.app_utils import get_app
from app.utils.email_utils import send_otp_email
from app.utils.jwt_utils import create_access_token
from app.utils.logger import logger

user_auth_router = APIRouter(prefix="/user_auth", tags=["user_auth"])

@user_auth_router.post("/send-otp", summary="Send OTP to user's email")
async def send_otp(payload: SendOTPRequest):
    try:
        app = get_app()
        async with AsyncSessionLocal() as session:
            #TODO P1: First check if shop exists in redis, if not, then check in db
            #TODO P1: Those checking redis code keep inside handler of get_shop_pk
            #TODO P1: Check others handlers, Does it exists in cache use it, else check in db
            shop = await app.analytics_handler.get_shop_pk(payload.shop_id, session)
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

        #TODO P1: Why are we keeping _task in variable name ?

        async with AsyncSessionLocal() as session:
            shop_pk_task = app.analytics_handler.get_shop_pk(payload.shop_id, session)
        otp_task = app.otp_handler.get_otp_by_email(payload.email)
        shop_id, stored_otp = await asyncio.gather(shop_pk_task, otp_task)

        if not shop_id:
            raise HTTPException(status_code=404, detail="Shop not found")

        if not stored_otp or stored_otp != payload.otp.strip():
            raise HTTPException(status_code=400, detail="Invalid OTP")

        #TODO P1: After successful verification, delete the OTP and their email_ids from redis
        
        user = await app.user_handler.get_user_by_email_and_shop_id(email=payload.email, shop_id=shop_id)
        if not user:
            user = await app.user_handler.create_user(payload.email, shop_id, existing_user=user)

        if not user or not getattr(user, "id", None) or not getattr(user, "shop_id", None):
            logger.warning(f"Invalid user data during OTP verification: {user}")
            raise HTTPException(status_code=400, detail="User verification failed")
        
        token_data = {"user_id": user.id, "shop_id": user.shop_id}
        access_token = create_access_token(data=token_data)

        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify OTP")