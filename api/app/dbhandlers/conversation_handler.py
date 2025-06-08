from typing import Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.models.db.conversation import ConversationModel
from app.models.db.shop_admin import ShopModel, UserModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ConversationHandler:
    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Stores a conversation entry in the database."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = conversation_data["shop_id"]
                    #TODO: If shop_pk is not there in shopModel table because of db down etc, how are we handling it?
                    shop_stmt = select(ShopModel).where(ShopModel.id == shop_pk)
                    shop_result = await session.execute(shop_stmt)
                    shop_record = shop_result.scalars().first()

                    if not shop_record:
                        logger.error(f"Shop with PK {shop_pk} not found while trying to store conversation.")
                        raise ValueError(f"Shop with PK {shop_pk} not found.")

                    user_pk = conversation_data["user_id"]

                    if user_pk is not None:
                        user_stmt = select(UserModel).where(UserModel.id == user_pk)
                        user_result = await session.execute(user_stmt)
                        user_record = user_result.scalars().first()
    
                    if not user_record:
                        logger.warning(f"User with PK {user_pk} not found; proceeding as anonymous.")
                        user_pk = None

                    conversation = ConversationModel(
                        user_query=conversation_data["user_query"],
                        agent_response=conversation_data["agent_response"],
                        user_id=user_pk, 
                        shop_id=shop_pk 
                    )
                    session.add(conversation)
                    await session.flush()
                    logger.info(f"Successfully stored conversation with id {conversation.id} for user_pk {user_pk}, shop_pk {shop_pk}")
                    await session.commit()
                    return conversation.id
                except SQLAlchemyError as error:
                    #TODO: Are we rollback if any error cause ?
                    logger.error(f"Database error in store_conversation: {str(error)}", exc_info=True)
                    raise 
                except ValueError as ve:
                    logger.error(f"ValueError in store_conversation: {str(ve)}")
                    raise