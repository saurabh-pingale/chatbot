from datetime import datetime, UTC

from app.external_service.redis_client import get_redis_client
from app.utils.logger import logger

class OTPHandler:
    def __init__(self):
        self.redis_prefix = "otp:"

    def _otp_key(self, email: str) -> str:
        return f"{self.redis_prefix}{email}"

    async def store_otp(self, email: str, otp: str, expired_at: datetime):
        try:
            redis = await get_redis_client()
            ttl_seconds = int((expired_at - datetime.now(UTC)).total_seconds())
            await redis.set(self._otp_key(email), otp, ex=ttl_seconds)
        except Exception as e:
            logger.error(f"Error storing OTP in Redis: {e}", exc_info=True)
            raise RuntimeError(f"Failed to store OTP for {email}") from e

    async def get_otp_by_email(self, email: str) -> str | None:
        try:
            redis = await get_redis_client()
            otp = await redis.get(self._otp_key(email))
            return otp
        except Exception as e:
            logger.error(f"Error retrieving OTP from Redis: {e}", exc_info=True)
            raise RuntimeError(f"Failed to retrieve OTP for {email}") from e