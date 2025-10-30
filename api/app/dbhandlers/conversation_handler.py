from typing import Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.models.db.conversation import ConversationModel
from app.models.db.shop_admin import UserModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ConversationHandler:
    async def record_conversation_handler(self, conversation_data: Dict[str, Any]) -> int:
        """Stores a conversation entry in the database."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = conversation_data.get("shop_id")
                    if not shop_pk:
                        logger.error("shop_id missing from conversation data. Skipping storage.")
                        return None
                    
                    user_pk = conversation_data.get("user_id")

                    if user_pk:
                        user_stmt = select(UserModel).where(UserModel.id == user_pk)
                        user_result = await session.execute(user_stmt)
                        user_record = user_result.scalars().first()
                        if not user_record:
                            logger.warning(f"User with PK {user_pk} not found; storing conversation without user association.")
                            user_pk = None
                    
                    conversation = ConversationModel(
                        user_query=conversation_data["user_query"],
                        agent_response=conversation_data["agent_response"],
                        user_id=user_pk,
                        shop_id=shop_pk
                    )
                    session.add(conversation)
                    #TODO P1: Remove this session.flush() because we are not using it anywhere the generated ID ?
                    #TODO P1: Mainly session.flush() helps to get the generated ID, but we are not using it anywhere, so remove this line
                    #TODO P1: So return the True or {status: "success"} instead of returning conversation.id directly
                    await session.flush()
                    
                    logger.info(f"Successfully stored conversation with id {conversation.id}, shop_pk {shop_pk}")
                    
                    return conversation.id
                except SQLAlchemyError as error:
                    logger.error(f"Database error in record_conversation_into_db: {error}", exc_info=True)
                    await session.rollback()
                    return {
                        "status": "error",
                        "error_type": "DatabaseError",
                        "message": str(error),
                        "conversation_data": conversation_data
                    }
                except Exception as e:
                    logger.error(f"Unhandled error in record_conversation_into_db: {e}", exc_info=True)
                    await session.rollback()
                    return {
                        "status": "error",
                        "error_type": "UnhandledException",
                        "message": str(e),
                        "conversation_data": conversation_data
                    }