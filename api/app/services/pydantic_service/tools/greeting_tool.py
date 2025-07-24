from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.utils.logger import logger

class GreetingTool(BaseTool):
    """Tool to handle greeting messages and out-of-context queries, redirecting users to store-related assistance"""
    
    def __init__(self):
        pass
    
    @property
    def tool_name(self) -> str:
        return "greeting"
    
    @property
    def description(self) -> str:
        return """ 
        Use this tool for greeting messages and out-of-context queries that are NOT related to the store's products or services.\n

        CRITICAL RULES:
        - Handle welcome messages, general greetings, and pleasantries
        - Redirect off-topic queries (weather, stories, general knowledge, etc.) back to store assistance
        - Provide friendly responses while guiding users to store-related help
        - NEVER attempt to answer non-store related questions directly

        Example triggers: 
        - Greetings: "Hello", "Hi", "Good morning", "How are you?"
        - Out-of-context: "What's the weather?", "Tell me a story", "What's 2+2?", "How to cook pasta?"
        - General chat: "How's your day?", "What do you do?", "Tell me about yourself"
        """;
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "user_message": {
                    "type": "string",
                    "description": "The user's greeting or out of context message"
                }
            },
            "required": ["user_message"]
        }
    
    async def run(self, shop_id: str, user_message: str) -> Dict[str, Any]:
        """Handle greeting and out-of-context messages"""
        try:
            logger.info(f"Greeting tool called for message: {user_message}")

            store_name = shop_id.replace(".myshopify.com", "")
            
            return {
                "store_name": store_name,
                "user_message": user_message,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error in greeting tool: {e}", exc_info=True)
            return {
                "store_name": store_name,
                "user_message": user_message,
                "success": False
            }