from sqlalchemy import select, update, func
from datetime import datetime, timedelta

from app.models.db.chat_limit import ChatLimitModel
from app.dbhandlers.db import AsyncSessionLocal
from app.constants import MESSAGE_LIMIT, SESSION_TIMEFRAME_MINUTES, LOCKOUT_HOURS
from app.utils.logger import logger

class ChatLimitHandler:
    async def check_and_update_limit(self, user_id: int) -> bool:
        """
        Checks and updates the user's chat limit. Returns True if the limit is exceeded.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    now = datetime.utcnow()
                    
                    stmt = select(ChatLimitModel).where(ChatLimitModel.user_id == user_id)
                    result = await session.execute(stmt)
                    limit_record = result.scalar_one_or_none()

                    if not limit_record:
                        limit_record = ChatLimitModel(user_id=user_id, message_count=1, first_message_at=now)
                        session.add(limit_record)
                        return False

                    if limit_record.limit_reached_at:
                        if now < limit_record.limit_reached_at + timedelta(hours=LOCKOUT_HOURS):
                            return True 
                        else:
                            limit_record.message_count = 1
                            limit_record.first_message_at = now
                            limit_record.limit_reached_at = None
                            return False

                    if now > limit_record.first_message_at + timedelta(minutes=SESSION_TIMEFRAME_MINUTES):
                        limit_record.message_count = 1
                        limit_record.first_message_at = now
                    else:
                        limit_record.message_count += 1

                    if limit_record.message_count >= MESSAGE_LIMIT:
                        limit_record.limit_reached_at = now
                        logger.info(f"Chat limit reached for user {user_id}.")
                        return True
                        
                    return False

                except Exception as e:
                    logger.error(f"Error in check_and_update_limit for user {user_id}: {e}", exc_info=True)
                    return False

    async def get_chat_limit(self, user_id: int) -> ChatLimitModel | None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ChatLimitModel).where(ChatLimitModel.user_id == user_id)
                    )
                    return result.scalars().first()
                except Exception as e:
                    logger.error(f"Error retrieving chat limit for user {user_id}: {e}", exc_info=True)
                    raise

    async def create_chat_limit(self, user_id: int) -> ChatLimitModel:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    new_limit = ChatLimitModel(user_id=user_id, message_count=1)
                    session.add(new_limit)
                    await session.commit()
                    return new_limit
                except Exception as e:
                    logger.error(f"Error creating chat limit for user {user_id}: {e}", exc_info=True)
                    await session.rollback()
                    raise

    async def increment_message_count(self, user_id: int):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    await session.execute(
                        update(ChatLimitModel)
                        .where(ChatLimitModel.user_id == user_id)
                        .values(message_count=ChatLimitModel.message_count + 1)
                    )
                    await session.commit()
                except Exception as e:
                    logger.error(f"Error incrementing message count for user {user_id}: {e}", exc_info=True)
                    await session.rollback()
                    raise

    async def reset_chat_limit(self, user_id: int):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    await session.execute(
                        update(ChatLimitModel)
                        .where(ChatLimitModel.user_id == user_id)
                        .values(message_count=1, session_start_time=func.now())
                    )
                    await session.commit()
                except Exception as e:
                    logger.error(f"Error resetting chat limit for user {user_id}: {e}", exc_info=True)
                    await session.rollback()
                    raise 