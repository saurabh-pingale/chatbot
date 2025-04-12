from fastapi import HTTPException
from typing import Dict, Any
from app.external_service.shopify_service import ShopifyService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.products_utils import get_products_from_admin, create_product_embeddings
from app.utils.logger import logger

class ProductsService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_service = ShopifyService(shopify_store, shopify_access_token)
        self.embeddings_handler = EmbeddingsHandler()

    async def create(self, namespace: str) -> Dict[str, Any]:
        """Fetch products from Shopify, generate embeddings and store in vector DB"""
        try:
            logger.info(f"Shopify Store: {self.shopify_service.shopify_store}, Access Token: {self.shopify_service.shopify_access_token}")
            products, collections = await get_products_from_admin( self.shopify_service.shopify_store, self.shopify_service.shopify_access_token)
        
            products_embeddings = await create_product_embeddings(products)

            await self.embeddings_handler.store_embeddings(products_embeddings, namespace)
            
            return {
                "status": "success",
                "message": "Products fetched and stored successfully",
                "product_count": len(products),
                "collection_count": len(collections)
            }
            
        except Exception as error:
            logger.error(f"Error syncing products to vector DB: {error}")
            raise HTTPException(status_code=500, detail="Failed to sync products to vector DB")