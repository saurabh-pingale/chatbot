from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.models.db.chat_limit import ChatLimitModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ChatLimitHandler:
    async def get_chat_limit(self, user_id: int) -> ChatLimitModel | None:
        async with AsyncSessionLocal() as session:
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
            try:
                new_limit = ChatLimitModel(user_id=user_id, message_count=1)
                session.add(new_limit)
                await session.commit()
                await session.refresh(new_limit)
                return new_limit
            except Exception as e:
                logger.error(f"Error creating chat limit for user {user_id}: {e}", exc_info=True)
                await session.rollback()
                raise

    async def increment_message_count(self, user_id: int):
        async with AsyncSessionLocal() as session:
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