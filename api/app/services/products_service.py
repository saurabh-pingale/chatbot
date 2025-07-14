from fastapi import HTTPException
from typing import Dict, Any

from app.external_service.shopify_service import ShopifyService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.external_service.redis_client import get_redis_client
from app.constants import CATEGORY_CACHE_TTL_SECONDS
from app.utils.products_utils import get_products_from_admin, create_product_embeddings
from app.utils.logger import logger

class ProductsService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_service = ShopifyService(shopify_store, shopify_access_token)
        self.embeddings_handler = EmbeddingsHandler()
        self.shop_admin_handler = ShopAdminHandler()

    async def create(self, namespace: str) -> Dict[str, Any]:
        """Fetch products from Shopify, generate embeddings and store in vector DB"""
        try:
            products, collections = await get_products_from_admin(self.shopify_service.shopify_store, self.shopify_service.shopify_access_token)

            shop = await self.shop_admin_handler.get_shop_by_domain(namespace)
            if not shop:
                raise HTTPException(status_code=404, detail=f"Shop with domain {namespace} not found.")

            stored_collections = await self.shop_admin_handler.store_collections(collections)

            redis_client = await get_redis_client()
            redis_key = f"{namespace}:categories"

            categories_exists = await redis_client.exists(redis_key)
            if categories_exists:
                await redis_client.delete(redis_key)

            titles = [col["title"] for col in stored_collections if col.get("title")]
            if titles:
                await redis_client.sadd(redis_key, *titles)
                await redis_client.expire(redis_key, CATEGORY_CACHE_TTL_SECONDS)

            collection_id_map = {
                collection["title"]: collection["id"] for collection in stored_collections
            }

            unique_products = list({product.id: product for product in products}.values())
            await self.shop_admin_handler.record_products_handler(unique_products, collection_id_map, shop_id=shop.id)
        
            products_embeddings = await create_product_embeddings(products)
            await self.embeddings_handler.create_embeddings(products_embeddings, namespace)
            
            return {
                "status": "success",
                "message": "Products fetched and stored successfully",
                "product_count": len(products),
                "collection_count": len(collections)
            }
            
        except Exception as error:
            logger.error(f"Error syncing products to vector DB: {error}")
            raise HTTPException(status_code=500, detail="Failed to sync products to vector DB")