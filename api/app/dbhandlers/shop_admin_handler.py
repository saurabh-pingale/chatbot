import json
from fastapi import HTTPException
from typing import Optional, List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import func

from app.models.db.shop_admin import ProductModel, ShopModel, CollectionModel, IntegrationModel, OfferModel, ShopMetadataModel
from app.models.api.shop_admin import (ProductRequest)
from app.models.api.shopify import ShopifyProduct
from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.external_service.redis_client import get_redis_client
from app.config import US_COUNTRY_CODE
from app.utils.products_utils import extract_shopify_id
from app.utils.logger import logger

class ShopAdminHandler:
    def __init__(self):
        self.shop_config_handler = ShopConfigHandler()
        pass

    async def create_collections(self, collections: List[CollectionModel], shop_id: int) -> List[dict]:
        """Create collections in the database using bulk operations."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    created_collections_info  = []
                    collection_data_to_insert = []
                    
                    for collection in collections:
                        title = getattr(collection, 'title', None)
                        products_count = getattr(collection, 'products_count', None)

                        if not title or products_count is None:
                            logger.warning("Skipping invalid collection with missing title or products_count.")
                            continue

                        collection_data_to_insert.append({
                            'title': collection.title,
                            'products_count': collection.products_count,
                            'shop_id': shop_id
                        })

                    if not collection_data_to_insert:
                        logger.warning("No valid collections to insert.")
                        return []    

                    stmt = insert(CollectionModel).values(collection_data_to_insert)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['shop_id', 'title'],
                        set_={'products_count': stmt.excluded.products_count}
                    )
                    stmt = stmt.returning(CollectionModel.id)

                    result = await session.execute(stmt)
                    ids = [row[0] for row in result]

                    created_collections_info = [
                        {
                            "title": col_data['title'],
                            "products_count": col_data['products_count'],
                            "id": id_val
                        }
                        for col_data, id_val in zip(collection_data_to_insert, ids)
                    ]

                    return created_collections_info 

                except SQLAlchemyError as error:
                    await session.rollback() 
                    logger.error("Database error in create_collections: %s", str(error), exc_info=True)
                    raise Exception("Failed to create collections due to a database error.")
                
    async def get_collections(self, shop_id: str) -> List[str]:
        async with AsyncSessionLocal() as session:
            shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail=f"Shop with domain {shop_id} not found.")
                
            stmt = select(CollectionModel.title).where(CollectionModel.shop_id == shop_pk)
            execution_result = await session.execute(stmt)
            collection_titles = execution_result.all()

            return collection_titles

    async def create_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int], shop_pk: int) -> None:
        """Create products in the database and links them to collections using bulk insert."""
        if not products:
            logger.info("No products to create. Skipping database insert.")
            return 
        
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    product_data_to_insert = []

                    for product in products:
                        logger.info(f"Product in Create Product: {product}")
                        col_id = collection_id_map.get(getattr(product, 'category', ''))

                        product_variant_id_gid = getattr(product, 'variant_id', None)
                        
                        product_data_to_insert.append({
                            'id': getattr(product, 'id', None),
                            'title': getattr(product, 'title', ''),
                            'description': getattr(product, 'description', ''),
                            'category': getattr(product, 'category', ''),
                            'url': getattr(product, 'url', ''),
                            'price': float(getattr(product, 'price', 0.0)) if getattr(product, 'price', None) else None,
                            'image': getattr(product, 'image', ''),
                            'variant_id': extract_shopify_id(product_variant_id_gid) if product_variant_id_gid else None,
                            'variant_quantity': getattr(product, 'variant_quantity', None),
                            'collection_id': col_id if col_id else None,
                            'shop_id': shop_pk
                        })

                    stmt = insert(ProductModel).values(product_data_to_insert)

                    stmt = stmt.on_conflict_do_update(
                        index_elements=['id'], 
                        set_={
                            'title': stmt.excluded.title,
                            'description': stmt.excluded.description,
                            'category': stmt.excluded.category,
                            'url': stmt.excluded.url,
                            'price': stmt.excluded.price,
                            'image': stmt.excluded.image,
                            'variant_id': stmt.excluded.variant_id,
                            'variant_quantity': stmt.excluded.variant_quantity,
                            'collection_id': stmt.excluded.collection_id,
                        }
                    )

                    await session.execute(stmt)

                except Exception as error:
                    logger.error("Error in create_products: %s", str(error), exc_info=True)
                    raise Exception("Failed to create or update products in the database.")

    async def get_support_contact(self, shop_id: str) -> dict:
        """Fetches support email and phone for a given shop name."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                    if not shop_id_pk:
                        logger.warning(f"No shop found with name: {shop_id}")
                        return {
                            "support_email": None,
                            "support_phone": None
                        }
                    
                    shop = await session.get(ShopModel, shop_id_pk)
                    logger.info(f"[DEBUG] Loaded full shop: {shop}")
                    
                    support_country_code = getattr(shop, "support_country_code", None) or US_COUNTRY_CODE
                    support_email = getattr(shop, "support_email", None)
                    support_phone = getattr(shop, "support_phone", "")

                    return {
                        "support_email": support_email,
                        "support_phone": f"{support_country_code}{support_phone}"
                    }
                except SQLAlchemyError as error:
                    logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                    return {
                        "support_email": None,
                        "support_phone": None
                    }
    
    async def create_color_preference(self, shop_id, shop_pk: str, color: str) -> None:
        """Create the color preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    if not shop_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:
                        shop = await session.get(ShopModel, shop_pk)

                    shop.preferred_color = color
                    return shop.preferred_color

                except SQLAlchemyError as error:
                    logger.error("Database error in create_color_preference: %s", str(error), exc_info=True)
                    raise Exception("Failed to save color preference.")
            
    async def create_support_info(self, shop_id: str, shop_pk: int, email: str, phone: str, country_code: str) -> dict:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    if not shop_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:    
                        shop = await session.get(ShopModel, shop_pk)

                    shop.support_email = email
                    shop.support_phone = phone
                    shop.support_country_code = country_code

                    return {
                        "supportEmail": shop.support_email,
                        "supportPhone": shop.support_phone,
                        "supportCountryCode": shop.support_country_code,
                    }
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving support info: %s", str(error), exc_info=True)
                    raise Exception("Failed to save support information.")

    async def create_shop_image(self, shop_id: str, shop_pk: int, image_url: str) -> dict:
        """Create the image URL for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    if not shop_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:
                        shop = await session.get(ShopModel, shop_pk)

                    shop.image = image_url

                    return {
                        "image": shop.image
                    }
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving shop image: %s", str(error), exc_info=True)
                    raise Exception("Failed to save shop image.")

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetches a shop by its ID to check its status. Creates a shop record if not found."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    query = select(ShopModel).where(ShopModel.shop_id == shop_id)
                    result = await session.execute(query)
                    shop = result.scalars().first()

                    if not shop:
                        logger.info(f"Creating new shop record for shop_id: {shop_id}")
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                        return shop

                    return shop
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_shop_by_id for shop {shop_id}: {error}", exc_info=True)
                    raise Exception("Database operation failed while fetching shop status.")
                
    async def create_email_gate_preference(self, shop_id: str, shop_pk: int, show_email_gate: bool) -> None:
        """Create the email gate preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    if not shop_pk:
                        shop = ShopModel(shop_id=shop_id, show_email_gate=show_email_gate)
                        session.add(shop)
                        logger.info(f"New shop created with shop_id {shop_id} and email gate preference {show_email_gate}")
                    else:
                        shop = await session.get(ShopModel, shop_pk)
                        shop.show_email_gate = show_email_gate
                        logger.info(f"Updated email gate preference for shop_id {shop_id} to {show_email_gate}")
         
                except SQLAlchemyError as error:
                    logger.error(f"Database error in create_email_gate_preference for shop {shop_id}: {error}", exc_info=True)
                    raise Exception(f"Failed to create or update email gate preference for shop {shop_id}")
                
    async def create_integration(self, shop_id: str, shop_pk: int, title: str, description: str) -> None:
        """Create integration details for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    integration = IntegrationModel(
                        shop_id=shop_pk,
                        title=title,
                        description=description
                    )
                    session.add(integration)
                except SQLAlchemyError as error:
                    logger.error(f"Database error in save_integration for shop {shop_id}: {error}", exc_info=True)
                    raise Exception(f"Failed to create integration for shop {shop_id}")
                
    async def update_shop_setup_completed_status(self, shop_id: int, status: bool) -> None:
        """Updates the setup_completed status for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await session.get(ShopModel, shop_id)
                    if shop:
                        shop.setup_completed = status
                        logger.info(f"Updated setup_completed status for shop_id {shop_id} to {status}")
                except SQLAlchemyError as e:
                    logger.error(f"Database error in update_shop_setup_completed_status for shop {shop_id}: {e}", exc_info=True)
                    raise Exception(f"Failed to update setup_completed status for shop {shop_id}")
                
    async def create_offers(self, products: List[ShopifyProduct], shop_pk: int) -> None:
        """Extracts unique tags from products and stores them as offers."""
        offers_to_insert = []
        for product in products:
            if getattr(product, 'tags', []):
                for tag in product.tags:
                    if tag.strip():
                        offers_to_insert.append({
                            'tag': tag.strip(),
                            'shop_id': shop_pk,
                            'product_id': product.id
                        })

        if not offers_to_insert:
            return

        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(OfferModel).where(OfferModel.shop_id == shop_pk))
                stmt = insert(OfferModel).values(offers_to_insert)
                stmt = stmt.on_conflict_do_nothing(index_elements=['tag', 'product_id'])
                await session.execute(stmt)

    async def cache_offer_products(self, namespace: str, products: List[ShopifyProduct]) -> None:
        """Serializes and caches products that have tags in Redis."""
        redis_key = f"offers:{namespace}:products"
        try:
            redis_client = await get_redis_client()
            products_data = [product.model_dump() for product in products]
            # Cache for 24 hours
            await redis_client.set(redis_key, json.dumps(products_data), ex=86400)
            logger.info(f"Successfully cached {len(products)} products with offers for '{namespace}'.")
        except Exception as e:
            logger.error(f"Failed to cache offer products for '{namespace}': {e}", exc_info=True)

    async def get_offers(self, shop_id: int) -> List[Dict]:
        """Retrieves all offers (tags) for a shop, using Redis as a cache."""
        redis_key = f"offers:{shop_id}:tags"
        try:
            redis_client = await get_redis_client()
            cached_offers = await redis_client.get(redis_key)
            if cached_offers:
                logger.info(f"Cache hit for offers in namespace '{shop_id}'.")
                return json.loads(cached_offers)
        except Exception as e:
            logger.error(f"Redis error getting offers for '{shop_id}': {e}", exc_info=True)

        logger.info(f"Cache miss for offers in namespace '{shop_id}'. Fetching from DB.")
        async with AsyncSessionLocal() as session:
            async with session.begin():
                shop_id_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                
                stmt = (
                    select(OfferModel)
                    .options(joinedload(OfferModel.product))
                    .where(OfferModel.shop_id == shop_id_pk)
                )
                result = await session.execute(stmt)
                offers = result.scalars().unique().all()

                offers_data = [{
                    "id": offer.id,
                    "tag": offer.tag,
                    "product": {
                        "id": offer.product.id,
                        "title": offer.product.title,
                        "description": offer.product.description,
                        "price": offer.product.price,
                        "image": offer.product.image,
                        "url": offer.product.url,
                        "variant_id": offer.product.variant_id
                    }
                } for offer in offers if offer.product]

                try:
                    redis_client = await get_redis_client()
                    # Cache the result for 1 hour
                    await redis_client.set(redis_key, json.dumps(offers_data), ex=3600)
                except Exception as e:
                    logger.error(f"Redis error setting offers for '{shop_id}': {e}", exc_info=True)

                return offers_data

    async def upsert_shop_metadata(self, shop_pk: int, namespace: str, metadata: dict):        
        async with AsyncSessionLocal() as session:
            try:
                stmt = insert(ShopMetadataModel).values(
                    shop_id=shop_pk,
                    namespace=namespace,
                    config_data=metadata
                )

                update_stmt = stmt.on_conflict_do_update(
                    index_elements=['shop_id'],
                    set_=dict(config_data=metadata, updated_at=func.now())
                )
                
                await session.execute(update_stmt)
                await session.commit()
                logger.info(f"Successfully upserted metadata for shop_id: {shop_pk}")

            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Database error on metadata upsert for shop_id {shop_pk}: {e}", exc_info=True)
            except Exception as e:
                await session.rollback()
                logger.error(f"Unexpected error on metadata upsert for shop_id {shop_pk}: {e}", exc_info=True)
