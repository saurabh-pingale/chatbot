from .base_tool import BaseTool
from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Dict, Any

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

    async def run(self, ctx: RunContext[None], user_message: str, **kwargs) -> Dict[str, Any]:
        try:
            shopId = kwargs.get("shopId", "")

            embedding = EmbeddingService.create_embeddings(user_message)
            results = await self.embeddings_handler.query_embeddings(
                vector=embedding, 
                namespace=shopId
            )
            logger.info(f"-------Terms Query Results: {results}")
            
            term_texts = []
            for hit in results:
                md = hit.metadata
                if isinstance(md, dict):
                    text = md.get("text")
                else:
                    text = getattr(md, "text", None)
                if text:
                    term_texts.append(text)

            if not term_texts:
                print("Warning: No terms found for query")
            
            return {"terms": term_texts}
        except Exception as e:
            print(f"Error in terms tool: {e}")
            raise ModelRetry(f"Failed to fetch terms: {str(e)}, retrying...")