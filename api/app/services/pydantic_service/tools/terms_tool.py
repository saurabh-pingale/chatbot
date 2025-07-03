from pydantic_ai import RunContext
from typing import Dict, Any

from .base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.logger import logger

class TermsTool(BaseTool):
    """Answer queries related to store policies"""
    @property
    def tool_name(self) -> str:
        return "terms"
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()

    async def run(self, ctx: RunContext[None], query: str) -> Dict[str, Any]:
        try:
            tool_usage_tracker = ctx.deps.get("tool_usage_tracker", {})

            if tool_usage_tracker.get("product_called", False):
                logger.warning("Skipping TermsTool call because ProductTool was already used in this turn.")
                return {"answer": "", "policy_details": "Policy details are not relevant right now."}
            
            total_calls = tool_usage_tracker.get("total_non_product_calls", 0)
            max_calls = tool_usage_tracker.get("max_non_product_calls", 10)
            
            if total_calls >= max_calls:
                logger.warning(f"Terms tool call limit exceeded: {total_calls}/{max_calls}")
                tool_usage_tracker["terms_tool_blocked"] = True
                return {
                    "answer": "",
                    "limit_exceeded": True
                }
            
            tool_usage_tracker["total_non_product_calls"] = total_calls + 1
            tool_usage_tracker["terms_call_count"] = tool_usage_tracker.get("terms_call_count", 0) + 1
            logger.info(f"Terms tool called. Total non-product calls: {tool_usage_tracker['total_non_product_calls']}")
            
            shopId = ctx.deps.get("shopId")

            user_message_embedding = EmbeddingService.create_embeddings(query)
            terms_results = await self.embeddings_handler.query_embeddings(
                vector=user_message_embedding, 
                namespace=shopId
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
                logger.warning(f"Warning: No terms found for query: '{query}' in shop: {shopId}")
                no_info_message = [
                    "I apologize, but I couldn't find any specific information, I recommend:\n",
                    "Checking the store's policy pages or contacting customer support \n"
                ]
                return {
                    "answer": "".join(no_info_message)
                }
            
            return {
                "answer": "\n\n".join(extracted_term_texts)
            }
        except Exception as e:
            logger.error(f"Error in terms tool processing message for shopId '{shopId}': {e}")
            error_message = [
                "I'm having trouble accessing the store's policy information right now. ",
                "Please try again later or contact the store directly for immediate assistance."
            ]
            return {
                "answer": "".join(error_message)
            }