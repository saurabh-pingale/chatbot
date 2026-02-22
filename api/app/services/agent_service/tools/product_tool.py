from typing import Dict, Any

from app.services.agent_service.tools.base_tool import BaseTool
from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.rag_pipeline_utils import extract_products_from_response, deduplicate_results_by_variant
from app.utils.metadata_extractor import metadata_extractor
from app.utils.metadata_cache import MetadataCache
from app.utils.category_cache import CategoryCache
from app.utils.logger import logger

class ProductTool(BaseTool):
    """Tool to search for products based on a user's query."""
    
    def __init__(self):
        self.embeddings_handler = EmbeddingsHandler()
        self.shop_admin_handler = ShopAdminHandler()
        self.metadata_cache = MetadataCache()
        self.category_cache = CategoryCache()
    
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

        dynamic_categories = await self.category_cache.get_categories(shop_id)

        try:
            embedding = EmbeddingService.create_embeddings(query)
            metadata_config = await self.metadata_cache.get_config(shop_id) or {}
            metadata_filters = metadata_extractor.extract_all_metadata(
                query, 
                dynamic_categories=dynamic_categories,
                config=metadata_config
            )
            logger.info(f"Extracted Metadata Filters: {metadata_filters}")

            if not metadata_filters:
                logger.warning(f"No metadata filters extracted from query: '{query}'. Skipping vector search.")
                return {
                    "answer": "I'm sorry, I couldn't find any specific product details in your request. Could you please be more specific about what you're looking for?",
                    "products": [],
                    "categories": dynamic_categories,
                    "refined_query": query,
                    "original_query": query,
                    "not_found": True,
                    "success": False
                }

            results = await self.embeddings_handler.get_embeddings(
                vector=embedding, 
                namespace=shop_id, 
                agent_type="ProductAgent",
                metadata_filters=metadata_filters
            )
            logger.info(f"[ProductTool] Results from vector DB: {results}")

            unique_results = deduplicate_results_by_variant(results) if results else []
            products = extract_products_from_response(unique_results) or []
            logger.info(f"Extracted Products: {products}")

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
                "categories": [],
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