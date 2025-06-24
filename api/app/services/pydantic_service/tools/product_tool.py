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
from app.utils.metadata_extractor import metadata_extractor
from app.utils.logger import logger

class ProductTool(BaseTool):
    """Tool to search for products based on a user's query."""
    @property
    def tool_name(self) -> str:
        return "product"
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
    
    async def run(self, ctx: RunContext[None], query: str) -> Dict[str, Any]:
        """Performs a semantic search for products based on the user's query."""
        shopId = ctx.deps.get("shopId")
        logger.info(f"Performing product search for query: '{query}'")

        try:
            embedding = EmbeddingService.create_embeddings(query)
            metadata_filters = metadata_extractor.extract_all_metadata(query)
            logger.info(f"Metadta Filters Before passing: {metadata_filters}")

            results = await self.embeddings_handler.query_embeddings(
                vector=embedding, 
                namespace=shopId, 
                agent_type="ProductAgent",
                metadata_filters=metadata_filters
            )
            logger.info(f"Raw Result from Query Embeddings: {results}")

            unique_results = []
            seen_variant_ids = set()
            if results:
                for result in results:
                    variant_id = getattr(result.metadata, 'variant_id', None)
                    if variant_id and variant_id not in seen_variant_ids:
                        unique_results.append(result)
                        seen_variant_ids.add(variant_id)
                    elif not variant_id:
                        if result.id not in seen_variant_ids:
                             unique_results.append(result)
                             seen_variant_ids.add(result.id)

            products = extract_products_from_response(unique_results) or []

            product_cache = ctx.deps.get("product_cache")
            if isinstance(product_cache, list):
                product_cache.extend(products)

            categories = extract_categories(products) or []

            if not isinstance(products, list):
                raise ModelRetry("Invalid product data format, retrying...")
            
            return {
                "products": products,
                "categories": categories,
                "refined_query": query,
                "original_query": query
            }
        except Exception as e:
            logger.error(f"Error in product tool: {e}")
            raise ModelRetry(f"Failed to fetch products: {str(e)}, retrying...")