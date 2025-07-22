from sqlalchemy import select, delete
from datetime import datetime

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.otp import OTPModel
from app.utils.logger import logger

class OTPHandler:
    async def store_otp(self, email: str, otp: str, expired_at: datetime):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    #TODO: Shift this OTP to redis, so that we will have expired_at will handle it automatically
                    await session.execute(delete(OTPModel).where(OTPModel.email == email))
                    new_otp = OTPModel(email=email, otp=otp, expired_at=expired_at)
                    session.add(new_otp)
                    await session.commit()
                except Exception as e:
                    logger.error(f"Error storing OTP: {e}", exc_info=True)
                    await session.rollback()
                    raise

    async def get_otp_by_email(self, email: str) -> OTPModel | None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    #TODO: Here we are not checking expired_at, what is the point of introducing expired_at then ?
                    #TODO: check from redis, instead of db
                    result = await session.execute(
                        select(OTPModel).where(OTPModel.email == email)
                    )
                    return result.scalars().first()
                except Exception as e:
                    logger.error(f"Error retrieving OTP: {e}", exc_info=True)
                    raise

    #TODO: Any OTP should delete after 5 mins, so we don't need delete_otp
    async def delete_otp(self, email: str):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    await session.execute(delete(OTPModel).where(OTPModel.email == email))
                    await session.commit()
                except Exception as e:
                    logger.error(f"Error deleting OTP: {e}", exc_info=True)
                    await session.rollback()
                    raise 