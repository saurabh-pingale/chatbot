from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.logger import logger

class TermsTool(BaseTool):
    """Tool to answer queries related to store policies and terms"""
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
    
    @property
    def tool_name(self) -> str:
        return "terms"
    
    @property
    def description(self) -> str:
        return """
        Use this tool for ANY policy-related questions including:
        - Return policy, refund policy, exchange policy
        - Cancellation policy, shipping policy, delivery timelines
        - Store terms and conditions, warranty information
        
        CRITICAL RULES:
        - ALWAYS use this tool FIRST for policy questions - never answer directly
        - Tool provides store-specific policy information only
        - NEVER generate assumptions about policies or timelines
        
        Example triggers: 
        "What's the return policy?", "Can I return my product?", "What is cancellation policy?", "How long does shipping take?", "Do you accept exchanges?", "What are refund conditions?", "Can I cancel my ordered product?"
        """

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The user's query about store policies or terms"
                }
            },
            "required": ["query"]
        }
    
    async def run(self, query: str, shop_id: str) -> Dict[str, Any]:
        """Search for policy information based on the query"""
        try:
            logger.info(f"Terms tool called for query: '{query}' in shop: {shop_id}")
            
            user_message_embedding = EmbeddingService.create_embeddings(query)
            terms_results = await self.embeddings_handler.get_embeddings(
                vector=user_message_embedding, 
                namespace=shop_id
            )
            logger.info(f"Terms Result: {terms_results}")
            
            extracted_term_texts = []
            for query_match in terms_results:
                metadata_content = query_match.metadata
                text_content = None
                if isinstance(metadata_content, dict):
                    text_content = metadata_content.get("text")
                else:
                    if metadata_content is not None:
                        text_content = getattr(metadata_content, "text", None)
                if text_content:
                    extracted_term_texts.append(text_content)
            
            logger.info(f"Extracted Terms Text: {extracted_term_texts}")
            
            if not extracted_term_texts:
                logger.warning(f"Warning: No terms found for query: '{query}' in shop: {shop_id}")
                return {
                    "answer": "I apologize, but I couldn't find any specific information.\n"
                            "Please check the store's policy pages or contact customer support.",
                    "success": False
                }
            
            return {
                "answer": "\n\n".join(extracted_term_texts),
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error in terms tool processing message for shopId '{shop_id}': {e}", exc_info=True)
            return {
                "answer": "I'm having trouble accessing the store's policy information right now. "
                        "Please try again later or contact the store directly.",
                "success": False,
                "error": str(e)
            }