from fastapi import HTTPException
from datetime import datetime, timedelta 
from typing import Dict, Any

from app.dbhandlers.db import AsyncSessionLocal
from app.external_service.shopify_service import ShopifyService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.utils.metadata_generator import MetadataGenerator
from app.utils.category_cache import CategoryCache

# TODO: Remove it when pricing flow is automated completely
from app.dbhandlers.subscription_handler import SubscriptionHandler

from app.external_service.redis_client import get_redis_client

# TODO: Remove it when pricing flow is automated completely
from app.models.db.subscription import SubscriptionStatus

from app.utils.products_utils import (
    get_products_from_admin,
    create_product_embeddings,
    normalize_and_clean_metafields,
)
from app.utils.progress_tracker import ProgressTracker
from app.utils.logger import logger

class ProductsService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_service = ShopifyService(shopify_store, shopify_access_token)
        self.embeddings_handler = EmbeddingsHandler()
        self.shop_admin_handler = ShopAdminHandler()
        self.analytics_handler = AnalyticsHandler()
        self.metadata_generator = MetadataGenerator()
        self.category_cache = CategoryCache()

        # TODO: Remove it when pricing flow is automated completely
        self.subscription_handler = SubscriptionHandler()

    async def create(self, namespace: str, task_id: str) -> Dict[str, Any]:
        """Fetch products from Shopify, generate embeddings and store in vector DB"""

        steps_config = {
            "INITIALIZE": 2,
            "FETCH_PRODUCTS": 8,
            "PROCESS_METADATA": 10,
            "SAVE_PRODUCTS_DB": 15,
            "GENERATE_EMBEDDINGS": 55,
            "STORE_EMBEDDINGS": 5,
            "FINALIZE_SETUP": 5,
        }
        tracker = ProgressTracker(task_id, steps_config)

        try:
            await tracker.report_progress("INITIALIZE", "Connecting to your Shopify store...")

            products, collections = await get_products_from_admin(self.shopify_service.shopify_store, self.shopify_service.shopify_access_token)
            await tracker.report_progress("FETCH_PRODUCTS", f"Found {len(products)} products to sync.")

            for product in products:
                if hasattr(product , "metafields"):
                    product.metafields = normalize_and_clean_metafields(product.metafields)

            sample_products_by_category = {}
            for product in products:
                category = getattr(product, 'category', None)
                if category and category not in sample_products_by_category:
                    sample_products_by_category[category] = product

            async with AsyncSessionLocal() as session:
                shop_pk = await self.analytics_handler.get_shop_pk(namespace, session)
                if not shop_pk:
                    raise HTTPException(status_code=404, detail=f"Shop with domain {namespace} not found.")
                
                await self.metadata_generator.generate_and_store_config(
                    shop_id=shop_pk,
                    namespace=namespace,
                    sample_products_by_category=sample_products_by_category,
                    collections=collections
                )
                await tracker.report_progress("PROCESS_METADATA", "Analyzing product categories and metadata.")

            stored_collections = await self.shop_admin_handler.create_collections(collections)

            titles = [col["title"] for col in stored_collections if col.get("title")]
            await self.category_cache.update_categories_cache(namespace, titles)

            collection_id_map = {
                collection["title"]: collection["id"] for collection in stored_collections
            }

            products_with_tags = [p for p in products if getattr(p, 'tags', [])]
            if products_with_tags:
                await self.shop_admin_handler.create_offers(products_with_tags, shop_id=shop_pk)
                await self.shop_admin_handler.cache_offer_products(namespace, products_with_tags)

            unique_products = list({product.id: product for product in products}.values())
            await self.shop_admin_handler.create_products(unique_products, collection_id_map, shop_id=shop_pk)
            await tracker.report_progress("SAVE_PRODUCTS_DB", "Saving product information to our database.")
        
            products_embeddings = await create_product_embeddings(products, tracker)
           
            await self.embeddings_handler.create_embeddings(products_embeddings, namespace)
            await tracker.report_progress("STORE_EMBEDDINGS", "Storing embeddings in the vector database.")

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

            await tracker.report_progress("FINALIZE_SETUP", "Finalizing setup...")
            await tracker.complete("Sync complete!")
            
        except Exception as error:
            error_message = f"Error syncing products: {error}"
            logger.error(f"Background task {task_id} failed: {error_message}", exc_info=True)
            await tracker.fail("An unexpected error occurred.")