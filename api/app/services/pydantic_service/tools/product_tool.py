from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.external_service.redis_client import get_redis_client
from app.utils.rag_pipeline_utils import extract_products_from_response, deduplicate_results_by_variant
from app.utils.metadata_extractor import metadata_extractor
from app.utils.logger import logger

class ProductTool(BaseTool):
    """Tool to search for products based on a user's query."""
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
        self.shop_admin_handler = ShopAdminHandler()
    
    @property
    def tool_name(self) -> str:
        return "product"
    
    @property
    def description(self) -> str:
        return (
            "MANDATORY: Use this tool for ANY product-related query. "
            "ALWAYS call this tool when the user mentions: "
            "- Product names (shirt, shoes, dress, pants, etc.) "
            "- Product attributes (color, size, brand, material, fabric, price) "
            "- Shopping actions (find, search, show, looking for, want, need) "
            "- Categories or collections (men's, women's, kids, accessories) "
            "- Generic browsing (what do you have, show me products, browse) "
            "- ANY combination of the above. "
            "Examples requiring this tool: 'red shirt', 'Nike shoes', 'show me dresses', 'what products do you have', 'looking for jeans', 'size medium', 'under $50'. "
            "DO NOT answer product questions directly - ALWAYS use this tool first."
        )
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The user's search query for products"
                }
            },
            "required": ["query"]
        }
    
    async def run(self, query: str, shop_id: str) -> Dict[str, Any]:
        """Performs a semantic search for products based on the user's query."""
        logger.info(f"Performing product search for query: '{query}'")

        dynamic_categories = []
        try:
            redis_client = await get_redis_client()
            redis_key = f"{shop_id}:categories"
            categories_from_redis = await redis_client.smembers(redis_key)
            if categories_from_redis:
                 dynamic_categories = [cat.decode('utf-8') for cat in categories_from_redis]
                 logger.info(f"Dynamically fetched categories from Redis: {dynamic_categories}")
            else:
                dynamic_categories = await self.shop_admin_handler.get_collections(shop_id)
                logger.info(f"Dynamically fetched categories from DB: {dynamic_categories}")
        except Exception as cat_e:
            logger.warning(f"Could not fetch dynamic categories: {cat_e}")
            dynamic_categories = []

        try:
            embedding = EmbeddingService.create_embeddings(query)
            metadata_filters = metadata_extractor.extract_all_metadata(query, dynamic_categories=dynamic_categories)
            logger.info(f"Extracted Metadata Filters: {metadata_filters}")

            results = await self.embeddings_handler.get_embeddings(
                vector=embedding, 
                namespace=shop_id, 
                agent_type="ProductAgent",
                metadata_filters=metadata_filters if metadata_filters else None
            )
            logger.info(f"[ProductTool] Results from vector DB: {results}")

            unique_results = deduplicate_results_by_variant(results) if results else []
            products = extract_products_from_response(unique_results) or []
            logger.info(f"Extracted Products: {products}")

            if not products and metadata_filters:
                logger.info("Filtered search returned no results. Retrying with a pure semantic search.")
                results = await self.embeddings_handler.get_embeddings(
                    vector=embedding,
                    namespace=shop_id,
                    agent_type="ProductAgent",
                    metadata_filters=None
                )

                unique_results = deduplicate_results_by_variant(results) if results else []
                products = extract_products_from_response(unique_results) or []

            if not products:
                return {
                    "answer": f"No products found for '{query}', but other categories are available.",
                    "products": [],
                    "categories": dynamic_categories,
                    "refined_query": query,
                    "original_query": query,
                    "not_found": True,
                    "success": False 
                }
            
            logger.info(f"Query in Product Tool: {query}")
            logger.info(f"Total products returned: {len(products)}")

            return {
                "answer": f"Successfully found {len(products)} products for '{query}'.",
                "products": products,
                "categories": dynamic_categories,
                "refined_query": query,
                "original_query": query,
                "not_found": False
            }
            
        except Exception as e:
            logger.error(f"Product tool failed with error: {e}", exc_info=True)
            return {
                "answer": "An error occurred while searching for products.",
                "products": [],
                "categories": dynamic_categories,
                "refined_query": query,
                "original_query": query,
                "not_found": True
            }