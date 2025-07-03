from pydantic_ai import RunContext
from typing import Dict, Any

from .base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.external_service.redis_client import get_redis_client
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
        self.shop_admin_handler = ShopAdminHandler()
    
    async def run(self, ctx: RunContext[None], query: str) -> Dict[str, Any]:
        """Performs a semantic search for products based on the user's query."""
        shopId = ctx.deps.get("shopId")
        tool_usage_tracker = ctx.deps.get("tool_usage_tracker", {})

        total_calls = tool_usage_tracker.get("total_non_product_calls", 0)
        max_calls = tool_usage_tracker.get("max_non_product_calls", 10)

        if total_calls >= max_calls:
            logger.warning(f"Product tool call limit exceeded: {total_calls}/{max_calls}")
            tool_usage_tracker["product_tool_blocked"] = True
            return {
                "answer": "",
                "products": [],
                "categories": [],
                "limit_exceeded": True
            }
        
        if tool_usage_tracker.get("product_called", False):
            logger.warning("Product tool already called once, skipping additional call")
            return {
                "answer": "Product search was already performed for this query.",
                "products": [],
                "categories": [],
                "refined_query": query,
                "original_query": query,
                "not_found": True,
                "message": "Product search already performed"
            }
        
        tool_usage_tracker["product_called"] = True 
        tool_usage_tracker["product_call_count"] = tool_usage_tracker.get("product_call_count", 0) + 1

        logger.info(f"Performing product search for query: '{query}'")
        try:
            embedding = EmbeddingService.create_embeddings(query)
            metadata_filters = metadata_extractor.extract_all_metadata(query)
            logger.info(f"Extracted Metadata Filters: {metadata_filters}")

            results = await self.embeddings_handler.query_embeddings(
                vector=embedding, 
                namespace=shopId, 
                agent_type="ProductAgent",
                metadata_filters=metadata_filters
            )
            logger.info(f"[ProductTool] Results from vector DB: {results}")

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
            logger.info(f"Extracted Products: {products}")

            product_cache = ctx.deps.get("product_cache")
            if isinstance(product_cache, list):
                product_cache.extend(products)

            categories = extract_categories(products) or []
            logger.info(f"Extracted Categories: {categories}")

            if not products:
                redis_client = await get_redis_client()
                redis_key = f"{shopId}:categories"
                categories = list(await redis_client.smembers(redis_key))
                logger.info(f"Categories from Redis: {categories}")

                if not categories:
                    categories = await self.shop_admin_handler.get_collections(shopId)
                    logger.info(f"Categories from DB: {categories}") 

                return {
                    "answer": f"No products found for '{query}', but other categories are available.",
                    "products": [],
                    "categories": categories,
                    "refined_query": query,
                    "original_query": query,
                    "not_found": True 
                }
            
            logger.info(f"Qury in Product Tool: {query}")
            logger.info(f"Total products returned: {len(products)}")

            return {
                "answer": f"Successfully found {len(products)} products for '{query}'.",
                "products": products,
                "categories": categories,
                "refined_query": query,
                "original_query": query,
                "not_found": False
            }
        except Exception as e:
            logger.error(f"Product tool failed with error: {e}", exc_info=True)
            try:
                redis_client = await get_redis_client()
                redis_key = f"{shopId}:categories"
                categories = list(await redis_client.smembers(redis_key))
                if not categories:
                    categories = await self.shop_admin_handler.get_collections(shopId)
            except:
                categories = []
                
            return {
                "answer": "An error occurred while searching for products.",
                "products": [],
                "categories": categories,
                "refined_query": query,
                "original_query": query,
                "not_found": True,
                "error": str(e)
            }