from typing import Dict, Any

from app.dbhandlers.conversation_handler import ConversationHandler
from app.utils.logger import logger

class ConversationService:
    def __init__(self):
        self.db_handler = ConversationHandler()

    async def store_conversation(self, conversation_data: Dict[str, Any]) -> int:
        """Store conversation in the database."""
        try:
            return await self.db_handler.store_conversation(conversation_data)
        except Exception as error:
            logger.error(f"Error in store_conversation service: {str(error)}", exc_info=True)
            raise