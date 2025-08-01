from fastapi import HTTPException
from datetime import datetime, timedelta 
from typing import Dict, Any

from app.external_service.shopify_service import ShopifyService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.analytics_handler import AnalyticsHandler

# TODO: Remove it when pricing flow is automated completely
from app.dbhandlers.subscription_handler import SubscriptionHandler

from app.external_service.redis_client import get_redis_client
from app.constants import CATEGORY_CACHE_TTL_SECONDS

# TODO: Remove it when pricing flow is automated completely
from app.models.db.subscription import SubscriptionStatus

from app.utils.products_utils import get_products_from_admin, create_product_embeddings
from app.utils.logger import logger

class ProductsService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_service = ShopifyService(shopify_store, shopify_access_token)
        self.embeddings_handler = EmbeddingsHandler()
        self.shop_admin_handler = ShopAdminHandler()
        self.analytics_handler = AnalyticsHandler()

        # TODO: Remove it when pricing flow is automated completely
        self.subscription_handler = SubscriptionHandler()

    async def create(self, namespace: str) -> Dict[str, Any]:
        """Fetch products from Shopify, generate embeddings and store in vector DB"""
        try:
            products, collections = await get_products_from_admin(self.shopify_service.shopify_store, self.shopify_service.shopify_access_token)

            shop_pk = await self.analytics_handler.get_shop_pk(namespace)
            if not shop_pk:
                raise HTTPException(status_code=404, detail=f"Shop with domain {namespace} not found.")

            stored_collections = await self.shop_admin_handler.create_collections(collections)

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
            await self.shop_admin_handler.create_products(unique_products, collection_id_map, shop_id=shop_pk)
        
            products_embeddings = await create_product_embeddings(products)
            await self.embeddings_handler.create_embeddings(products_embeddings, namespace)

            # TODO: Remove it when pricing flow is automated completely
            shop = await self.shop_admin_handler.get_shop_status(namespace)

            if not shop or not shop.setup_completed:
                start_date = datetime.utcnow();
                end_date = start_date + timedelta(days=90)

                await self.subscription_handler.create_subscription(
                    shop_id=shop_pk,
                    plan="Free",
                    stripe_subscription_id=f"free-trial-{namespace}-{int(start_date.timestamp())}",
                    stripe_customer_id=f"free-customer-{namespace}",
                    status=SubscriptionStatus.TRIALING,
                    start_date=start_date,
                    end_date=end_date
                )

                await self.shop_admin_handler.update_shop_setup_completed_status(shop_pk, status=True)
            
            return {
                "status": "success",
                "message": "Products fetched and stored successfully",
                "product_count": len(products),
                "collection_count": len(collections),
                "setupCompleted": True # TODO: Remove it when pricing flow is automated completely
            }
            
        except Exception as error:
            logger.error(f"Error syncing products to vector DB: {error}")
            raise HTTPException(status_code=500, detail="Failed to sync products to vector DB")