from typing import Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from datetime import datetime

from app.models.db.conversation import ConversationModel
from app.models.db.shop_admin import ShopModel, UserModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ConversationHandler:
    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Stores a conversation entry in the database."""
        async with AsyncSessionLocal() as session:
            try:
                shop_id = conversation_data["shop_id"]
                shop = await session.execute(
                    select(ShopModel).where(ShopModel.shop_id == shop_id)
                )
                shop_record = shop.scalars().first()

                if not shop_record:
                    new_shop = ShopModel(
                        shop_id=shop_id,
                        created_at=datetime.utcnow(),  
                        updated_at=datetime.utcnow()  
                    )
                    session.add(new_shop)
                    await session.commit()
                    await session.refresh(new_shop)
                    shop_id = new_shop.id
                else:
                    shop_id = shop_record.id

                user_id = conversation_data["user_id"]
                user_query = await session.execute(
                    select(UserModel).where(UserModel.email == user_id)
                )
                user_record = user_query.scalars().first()

                if not user_record:
                    new_user = UserModel(
                        email=user_id,
                        shop_id=shop_id,
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
                    shop_id=shop_id
                )
                session.add(conversation)
                await session.commit()
                return conversation.id
            except SQLAlchemyError as error:
                session.rollback()
                logger.error(f"Database error in store_conversation: {str(error)}", exc_info=True)
                raise error