from typing import List
from app.external_service.redis_client import get_redis_client
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.logger import logger

class CategoryCache:
    def __init__(self):
        self.shop_admin_handler = ShopAdminHandler()
        self.redis_key_format = "{namespace}:categories"

    async def get_categories(self, namespace: str) -> List[str]:
        """
        Fetches categories from Redis. If not found, falls back to the database
        and caches the result for future requests.
        """
        redis_key = self.redis_key_format.format(namespace=namespace)
        try:
            redis_client = await get_redis_client()
            cached_categories = await redis_client.smembers(redis_key)
            if cached_categories:
                logger.info(f"Cache HIT: Fetched categories from Redis for '{namespace}'.")
                return [cat for cat in cached_categories]

            logger.info(f"Cache MISS: Fetching categories from DB for '{namespace}'.")
            db_categories = await self.shop_admin_handler.get_collections(namespace)

            if db_categories:
                logger.info(f"Populating category cache for '{namespace}' from DB results.")
                await redis_client.sadd(redis_key, *db_categories)
            
            return db_categories

        except Exception as e:
            logger.error(f"Failed to get categories for '{namespace}': {e}", exc_info=True)
            return []

    async def update_categories_cache(self, namespace: str, categories: List[str]) -> None:
        """Explicitly overwrites the category cache. Used during product sync."""
        if not categories:
            return

        redis_key = self.redis_key_format.format(namespace=namespace)
        try:
            redis_client = await get_redis_client()
            await redis_client.delete(redis_key)
            await redis_client.sadd(redis_key, *categories)
            logger.info(f"Successfully updated category cache for '{namespace}'.")

        except Exception as e:
            logger.error(f"Failed to update category cache for '{namespace}': {e}", exc_info=True)