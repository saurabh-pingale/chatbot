from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.models.db.conversation import Base, DBConversation
from app.config import DATABASE_URL
from app.utils.logger import logger

class ConversationHandler:
    def __init__(self):
        database_url = DATABASE_URL

        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")

        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)

        Base.metadata.create_all(self.engine)

    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Stores a conversation entry in the database."""
        session = self.Session()
        try:
            conversation = DBConversation(
                user_query=conversation_data["user_query"],
                agent_response=conversation_data["agent_response"],
                user_id=conversation_data["user_id"],
                store_id=conversation_data["store_id"]
            )
            session.add(conversation)
            session.commit()
            logger.info(f"Conversation stored in database with ID: {conversation.id}")
            return conversation.id
        except SQLAlchemyError as error:
            session.rollback()
            logger.error(f"Database error in store_conversation: {str(error)}", exc_info=True)
            raise error
        finally:
            session.close()

    async def get_conversations_by_user(self, user_id: int, store_id: int) -> List[Dict[str, Any]]:
        """Fetches conversations for a specific user and store."""
        session = self.Session()
        try:
            conversations = session.query(DBConversation).filter_by(
                user_id=user_id, store_id=store_id
            ).order_by(DBConversation.created_at).all()
            
            result = []
            for conv in conversations:
                result.append({
                    "id": conv.id,
                    "user_query": conv.user_query,
                    "agent_response": conv.agent_response,
                    "created_at": conv.created_at,
                    "user_id": conv.user_id,
                    "store_id": conv.store_id
                })
            return result
        except SQLAlchemyError as error:
            logger.error(f"Database error in get_conversations_by_user: {str(error)}", exc_info=True)
            raise error
        finally:
            session.close()