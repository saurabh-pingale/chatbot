from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from datetime import datetime

from app.models.db.conversation import ConversationModel
from app.models.db.store_admin import StoreModel, UserModel
from app.config import DATABASE_URL
from app.utils.logger import logger

class ConversationHandler:
    def __init__(self):
        database_url = DATABASE_URL

        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")

        self.engine = create_async_engine(database_url, echo=False)
        self.async_session = sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)

    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Stores a conversation entry in the database."""
        async with self.async_session() as session:
            try:
                store_name = conversation_data["store_id"]
                store = await session.execute(
                    select(StoreModel).where(StoreModel.store_name == store_name)
                )
                store_record = store.scalars().first()

                if not store_record:
                    # If store does not exist, create a new store
                    new_store = StoreModel(
                        store_name=store_name,
                        created_at=datetime.utcnow(),  
                        updated_at=datetime.utcnow()  
                    )
                    session.add(new_store)
                    await session.commit()
                    await session.refresh(new_store)
                    store_id = new_store.id
                else:
                    store_id = store_record.id

                user_id = conversation_data["user_id"]
                user_query = await session.execute(
                    select(UserModel).where(UserModel.email == user_id)
                )
                user_record = user_query.scalars().first()

                if not user_record:
                    new_user = UserModel(
                        email=user_id,
                        store_id=store_id,
                        created_at=datetime.utcnow(),  
                        updated_at=datetime.utcnow(),  
                    )
                    session.add(new_user)
                    await session.commit()
                    await session.refresh(new_user)  
                    user = new_user
                else:
                    user = user_record

                conversation = ConversationModel(
                    user_query=conversation_data["user_query"],
                    agent_response=conversation_data["agent_response"],
                    user_id=user.id,
                    store_id=store_id
                )
                session.add(conversation)
                await session.commit()
                return conversation.id
            except SQLAlchemyError as error:
                session.rollback()
                logger.error(f"Database error in store_conversation: {str(error)}", exc_info=True)
                raise error