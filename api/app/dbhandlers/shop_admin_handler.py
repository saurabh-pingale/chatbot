from typing import Optional, List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, join
from sqlalchemy.dialects.postgresql import insert

from app.models.db.shop_admin import ProductModel, ShopModel, CollectionModel, IntegrationModel
from app.models.api.shop_admin import (ProductRequest)
from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.config import US_COUNTRY_CODE
from app.utils.products_utils import extract_shopify_id
from app.utils.logger import logger

class ShopAdminHandler:
    def __init__(self):
        self.analytics_handler = AnalyticsHandler()
        pass

    async def create_collections(self, collections: List[CollectionModel]) -> List[dict]:
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
                            'products_count': collection.products_count
                        })

                    if not collection_data_to_insert:
                        logger.warning("No valid collections to insert.")
                        return []    

                    stmt = insert(CollectionModel).values(collection_data_to_insert)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['title'],  
                        set_={'products_count': stmt.excluded.products_count}
                    )

                    await session.execute(stmt)

                    titles = [col.get('title') for col in collection_data_to_insert]
                    stmt = select(CollectionModel).where(CollectionModel.title.in_(titles))
                    existing_collections = await session.execute(stmt)
                    collections_list = existing_collections.scalars().all()

                    for collection in collections_list:
                        created_collections_info.append({
                            "title": getattr(collection, "title"),
                            "products_count": getattr(collection, "products_count"),
                            "id": getattr(collection, "id")
                        })

                    return created_collections_info 

                except SQLAlchemyError as error:
                    await session.rollback() 
                    logger.error("Database error in create_collections: %s", str(error), exc_info=True)
                    raise Exception("Failed to create collections due to a database error.")
                
    async def get_collections(self, shop_id: str) -> List[str]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(CollectionModel.title)
                .select_from(
                    join(CollectionModel, ProductModel, CollectionModel.id == ProductModel.collection_id)
                )
                .join(ShopModel, ProductModel.shop_id == ShopModel.id)
                .where(ShopModel.shop_id == shop_id)
                .distinct()
            )
            execution_result = await session.execute(stmt)
            collection_rows = execution_result.all()

            if not collection_rows:
                logger.info(f"No collections found for shop_id: {shop_id}")
                return []
            
            collection_titles = [row[0] for row in collection_rows if row and row[0]]
            return collection_titles

    async def create_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int], shop_id: int) -> None:
        """Create products in the database and links them to collections using bulk insert."""
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
                            'collection_id': col_id if col_id else None,
                            'shop_id': shop_id
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
                    shop_id_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
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
    
    async def create_color_preference(self, shop_id: str, color: str) -> None:
        """Create the color preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk  = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_id_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:
                        shop = await session.get(ShopModel, shop_id_pk)

                    shop.preferred_color = color
                    return shop.preferred_color

                except SQLAlchemyError as error:
                    logger.error("Database error in create_color_preference: %s", str(error), exc_info=True)
                    raise Exception("Failed to save color preference.")
            
    async def create_support_info(self, shop_id: str, email: str, phone: str, country_code: str) -> dict:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_id_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:    
                        shop = await session.get(ShopModel, shop_id_pk)

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

    async def create_shop_image(self, shop_id: str, image_url: str) -> dict:
        """Create the image URL for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_id_pk:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    else:
                        shop = await session.get(ShopModel, shop_id_pk)

                    shop.image = image_url

                    return {
                        "image": shop.image
                    }
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving shop image: %s", str(error), exc_info=True)
                    raise Exception("Failed to save shop image.")

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetches a shop by its ID to check its status."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    query = select(ShopModel).where(ShopModel.shop_id == shop_id)
                    result = await session.execute(query)
                    shop = result.scalars().first()

                    if not shop:
                        logger.warning(f"No shop found with shop_id: {shop_id}")
                        return None

                    return shop
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_shop_by_id for shop {shop_id}: {error}", exc_info=True)
                    raise Exception("Database operation failed while fetching shop status.")
                
    async def create_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Create the email gate preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_id_pk:
                        shop = ShopModel(shop_id=shop_id, show_email_gate=show_email_gate)
                        session.add(shop)
                        logger.info(f"New shop created with shop_id {shop_id} and email gate preference {show_email_gate}")
                    else:
                        shop = await session.get(ShopModel, shop_id_pk)
                        shop.show_email_gate = show_email_gate
                        logger.info(f"Updated email gate preference for shop_id {shop_id} to {show_email_gate}")
         
                except SQLAlchemyError as error:
                    logger.error(f"Database error in create_email_gate_preference for shop {shop_id}: {error}", exc_info=True)
                    raise Exception(f"Failed to create or update email gate preference for shop {shop_id}")
                
    async def create_integration(self, shop_id: str, title: str, description: str) -> None:
        """Create integration details for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    integration = IntegrationModel(
                        shop_id=shop_id,
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