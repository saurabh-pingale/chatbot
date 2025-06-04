from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Dict, Any

from .base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.rag_pipeline_utils import (
    extract_products_from_response,
    extract_categories
)
from app.utils.logger import logger

class ProductTool(BaseTool):
    """Help users search for or learn about products"""
    @property
    def tool_name(self) -> str:
        return "product"
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
    
    async def run(self, ctx: RunContext[None], user_message: str, **kwargs) -> Dict[str, Any]:
        shopId = kwargs.get("shopId", "")

        try:
            embedding = EmbeddingService.create_embeddings(user_message)
            results = await self.embeddings_handler.query_embeddings(
                vector=embedding, 
                namespace=shopId, 
                agent_type="ProductAgent"
            )

            products = extract_products_from_response(results) or []

            categories = extract_categories(products) or []

            if not isinstance(products, list):
                raise ModelRetry("Invalid product data format, retrying...")
            
            return {
                "products": products,
                "categories": categories
            }
        except Exception as e:
            logger.error(f"Error in product tool: {e}")
            raise ModelRetry(f"Failed to fetch products: {str(e)}, retrying...")