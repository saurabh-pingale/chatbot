from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.external_service.redis_client import get_redis_client
from app.models.api.response import ProductResponse
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
            "This is the primary tool for all product-related inquiries." 
            "You must use this tool if the user's query is about finding, searching for, or filtering products. This includes any mention of product attributes such as color, size, brand, fabric, category, or price." 
            "Even if the query is a simple product name or category (e.g., 'red t-shirt', 'shoes', etc.), this tool must be invoked. "
            "The tool will return a list of matching products or a list of available categories if no direct matches are found."
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
        
        try:
            embedding = EmbeddingService.create_embeddings(query)
            metadata_filters = metadata_extractor.extract_all_metadata(query)
            logger.info(f"Extracted Metadata Filters: {metadata_filters}")

            results = await self.embeddings_handler.get_embeddings(
                vector=embedding, 
                namespace=shop_id, 
                agent_type="ProductAgent",
                metadata_filters=metadata_filters
            )
            logger.info(f"[ProductTool] Results from vector DB: {results}")

            categories = []
            unique_results = deduplicate_results_by_variant(results) if results else []

            products = extract_products_from_response(unique_results) or []
            logger.info(f"Extracted Products: {products}")

            if not products:
                redis_client = await get_redis_client()
                redis_key = f"{shop_id}:categories"
                categories = list(await redis_client.smembers(redis_key))
                logger.info(f"Categories from Redis: {categories}")

                if not categories:
                    categories = await self.shop_admin_handler.get_collections(shop_id)
                    logger.info(f"Categories from DB: {categories}") 

                return ProductResponse(
                    answer= f"No products found for '{query}', but other categories are available.",
                    products= [],
                    categories= categories,
                    refined_query= query,
                    original_query= query,
                    not_found= True,
                    success= False 
                )
            
            logger.info(f"Query in Product Tool: {query}")
            logger.info(f"Total products returned: {len(products)}")

            return ProductResponse(
                answer= f"Successfully found {len(products)} products for '{query}'.",
                products= products,
                categories= categories,
                refined_query= query,
                original_query= query,
                not_found= False
            )
            
        except Exception as e:
            logger.error(f"Product tool failed with error: {e}", exc_info=True)
            try:
                redis_client = await get_redis_client()
                redis_key = f"{shop_id}:categories"
                categories = list(await redis_client.smembers(redis_key))
                if not categories:
                    categories = await self.shop_admin_handler.get_collections(shop_id)
            except:
                categories = []
                
            return ProductResponse(
                answer= "An error occurred while searching for products.",
                products= [],
                categories= categories,
                refined_query= query,
                original_query= query,
                not_found= True,
                error= str(e)
            )