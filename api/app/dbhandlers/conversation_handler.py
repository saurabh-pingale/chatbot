from typing import Dict, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

from app.models.db.conversation import Base, DBConversation
from app.models.db.store_admin import DBStore, DBUser
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
        logger.info(f"Conversation Data: {conversation_data}")
        session = self.Session()
        try:
            store_name = conversation_data["store_id"]
            store = session.query(DBStore).filter_by(store_name=store_name).first()
            
            if not store:
                # If store does not exist, create a new store
                new_store = DBStore(
                    store_name=store_name,
                    created_at=datetime.utcnow(),  
                    updated_at=datetime.utcnow()  
                )
                session.add(new_store)
                session.commit()
                session.refresh(new_store)
                store_id = new_store.id
                logger.info(f"Created new store with ID: {store_id}")
            else:
                store_id = store.id
                logger.info(f"Found existing store with ID: {store_id}")

            user_id = conversation_data["user_id"]
            user = session.query(DBUser).filter_by(email=user_id).first()
            if not user:
                new_user = DBUser(
                    email=user_id,
                    store_id=store_id,
                    created_at=datetime.utcnow(),  
                    updated_at=datetime.utcnow(),  
                )
                session.add(new_user)
                session.commit()
                session.refresh(new_user)  
                user = new_user

            conversation = DBConversation(
                user_query=conversation_data["user_query"],
                agent_response=conversation_data["agent_response"],
                user_id=user.id,
                store_id=store_id
            )
            logger.info(f"Conversation: {conversation}")
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