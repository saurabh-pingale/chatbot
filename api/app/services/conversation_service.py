from typing import Dict, Any

from app.dbhandlers.conversation_handler import ConversationHandler
from app.utils.logger import logger

class ConversationService:
    def __init__(self):
        self.db_handler = ConversationHandler()

    async def record_conversation_into_db(self, conversation_data: Dict[str, Any]) -> int:
        """Store conversation in the database."""
        try:
            conversation_response = await self.db_handler.record_conversation_handler(conversation_data)
            if isinstance(conversation_response, dict) and conversation_response.get("status") == "error":
                logger.warning(f"Conversation failed to store: {conversation_response}")
            return conversation_response
        except Exception as error:
            logger.error(f"Error in record_conversation_into_db service: {str(error)}", exc_info=True)
            raise