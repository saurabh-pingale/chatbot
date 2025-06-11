from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Dict, Any

from .base_tool import BaseTool
from .entity_extraction_tool import ProductEntity
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.rag_pipeline_utils import (
    extract_products_from_response,
    extract_categories
)
from app.utils.logger import logger

class ProductTool(BaseTool):
    """Help users search for or learn about products by extracting entities from their query."""
    @property
    def tool_name(self) -> str:
        return "product"
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
    
    async def run(self, ctx: RunContext, product_query: ProductEntity) -> Dict[str, Any]:
        shopId = ctx.deps.get("shopId")

        try:
            refined_query = f"{product_query.color} {product_query.category} {' '.join(product_query.attributes)}".strip()
            logger.info(f"Initial refined query from entities: '{refined_query}'")

            if refined_query == "any product":
                logger.warning("Entity extraction yielded default values. Using original query for semantic search.")
                refined_query = product_query.query

            logger.info(f"Final refined product query: '{refined_query}'")

            embedding = EmbeddingService.create_embeddings(refined_query)
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
                "categories": categories,
                "refined_query": refined_query,
                "original_query": product_query.query
            }
        except Exception as e:
            logger.error(f"Error in product tool: {e}")
            raise ModelRetry(f"Failed to fetch products: {str(e)}, retrying...")