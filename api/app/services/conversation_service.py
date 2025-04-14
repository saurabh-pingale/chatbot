from typing import Dict, Any, List, Optional

from app.dbhandlers.conversation_handler import ConversationHandler
from app.utils.logger import logger

class ConversationService:
    def __init__(self):
        self.db_handler = ConversationHandler()

    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Store conversation in the database through the handler."""
        try:
            return await self.db_handler.store_conversation(conversation_data)
        except Exception as error:
            logger.error(f"Error in store_conversation service: {str(error)}", exc_info=True)
            raise

    async def get_user_conversations(self, user_id: int, store_id: int) -> List[Dict[str, Any]]:
        """Get conversations for a specific user and store."""
        try:
            return await self.db_handler.get_conversations_by_user(user_id, store_id)
        except Exception as error:
            logger.error(f"Error in get_user_conversations service: {str(error)}", exc_info=True)
            raise