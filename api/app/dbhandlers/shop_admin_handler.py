from typing import Optional, List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, join
from sqlalchemy.dialects.postgresql import insert
from datetime import datetime

from app.models.db.shop_admin import ProductModel, ShopModel, CollectionModel, IntegrationModel
from app.models.api.shop_admin import (ProductRequest)
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ShopAdminHandler:
    def __init__(self):
        pass

    async def get_shop_by_domain(self, shop_domain: str) -> Optional[ShopModel]:
        """Fetches a shop by its domain."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).filter(ShopModel.shop_id == shop_domain)
                    )
                    return result.scalars().first()
                except SQLAlchemyError as error:
                    logger.error("Database error in get_shop_by_domain: %s", str(error), exc_info=True)
                    raise error

    async def store_collections(self, collections: List[CollectionModel]) -> List[dict]:
        """Stores collections in the database using bulk operations."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = []
                    insert_data = []
                    for collection in collections:
                        insert_data.append({
                            'title': collection.title,
                            'products_count': collection.products_count
                        })

                    stmt = insert(CollectionModel).values(insert_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['title'],  
                        set_={'products_count': stmt.excluded.products_count}
                    )

                    await session.execute(stmt)

                    titles = [c['title'] for c in insert_data]
                    stmt = select(CollectionModel).where(CollectionModel.title.in_(titles))
                    existing_collections = await session.execute(stmt)
                    collections_list = existing_collections.scalars().all()

                    for collection in collections_list:
                        result.append({
                            "title": collection.title,
                            "products_count": collection.products_count,
                            "id": collection.id
                        })

                    return result

                except SQLAlchemyError as error:
                    logger.error("Database error in store_collections: %s", str(error), exc_info=True)
                    raise error
                
    async def get_collections(self, shop_id: str) -> List[str]:
        logger.info(f"Shop ID in Get Collection: {shop_id}")
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
            result = await session.execute(stmt)
            return [row[0] for row in result.all() if row[0]]

    async def record_products_handler(self, products: List[ProductRequest], collection_id_map: Dict[str, int], shop_id: int) -> None:
        """Stores products in the database and links them to collections using bulk insert."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    insert_data = []
                    for product in products:
                        col_id = collection_id_map.get(product.category)
                        insert_data.append({
                            'id': product.id,
                            'title': product.title,
                            'description': product.description,
                            'category': product.category,
                            'url': product.url,
                            'price': float(product.price) if product.price else None,
                            'image': product.image,
                            'collection_id': col_id if col_id else None,
                            'shop_id': shop_id
                        })

                    stmt = insert(ProductModel).values(insert_data)

                    stmt = stmt.on_conflict_do_update(
                        index_elements=['id'], 
                        set_={
                            'title': stmt.excluded.title,
                            'description': stmt.excluded.description,
                            'category': stmt.excluded.category,
                            'url': stmt.excluded.url,
                            'price': stmt.excluded.price,
                            'image': stmt.excluded.image,
                            'collection_id': stmt.excluded.collection_id
                        }
                    )

                    await session.execute(stmt)

                except Exception as error:
                    logger.error("Error in record_products_handler: %s", str(error), exc_info=True)
                    raise error

    async def get_support_contact(self, shop_id: str) -> Optional[dict]:
        """Fetches support email and phone for a given shop name."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).filter(ShopModel.shop_id == shop_id)
                    )
                    shop = result.scalars().one_or_none()
                    
                    if not shop:
                        logger.warning(f"No shop found with name: {shop_id}")
                        return None

                    return {
                        "support_email": shop.support_email,
                        "support_phone": f"{shop.support_country_code or '+1'}{shop.support_phone}"
                    }
                except SQLAlchemyError as error:
                    logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                    return None

    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Saves the color preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await session.execute(
                        select(ShopModel).where(ShopModel.shop_id == shop_id)
                    )
                    shop = shop.scalars().first()

                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)

                    shop.preferred_color = color

                except SQLAlchemyError as error:
                    logger.error("Database error in save_color_preference: %s", str(error), exc_info=True)
                    raise error
            
    async def save_support_info(self, shop_id: str, email: str, phone: str, country_code: str) -> dict:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).where(ShopModel.shop_id == shop_id)
                    )
                    shop = result.scalars().first()
                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)

                    shop.support_email = email
                    shop.support_phone = phone
                    shop.support_country_code = country_code

                    return {"success": True}
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving support info: %s", str(error), exc_info=True)
                    raise

    async def save_shop_image(self, shop_id: str, image_url: str) -> dict:
        """Saves the image URL for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).where(ShopModel.shop_id == shop_id)
                    )
                    shop = result.scalars().first()
                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)

                    shop.image = image_url
                    return {"success": True}
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving shop image: %s", str(error), exc_info=True)
                    return {"success": False}

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetches a shop by its ID to check its status."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).filter(ShopModel.shop_id == shop_id)
                    )
                    return result.scalars().first()
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_shop_by_id for shop {shop_id}: {error}", exc_info=True)
                    raise error

    async def save_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Saves the email gate preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_result = await session.execute(
                        select(ShopModel).where(ShopModel.shop_id == shop_id)
                    )
                    shop = shop_result.scalars().first()

                    if not shop:
                        shop = ShopModel(shop_id=shop_id, show_email_gate=show_email_gate)
                        session.add(shop)
                        logger.info(f"New shop created with shop_id {shop_id} and email gate preference {show_email_gate}")
                    else:
                        shop.show_email_gate = show_email_gate
                        logger.info(f"Updated email gate preference for shop_id {shop_id} to {show_email_gate}")
         
                except SQLAlchemyError as error:
                    logger.error(f"Database error in save_email_gate_preference for shop {shop_id}: {error}", exc_info=True)
                    raise error
                
    async def integration_handler(self, shop_id: str, title: str, description: str) -> None:
        """Saves integration details for a given shop ID."""
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
                    raise error

    async def update_setup_completed_status(self, shop_id: int, status: bool) -> None:
        """Updates the setup_completed status for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await session.get(ShopModel, shop_id)
                    if shop:
                        shop.setup_completed = status
                        logger.info(f"Updated setup_completed status for shop_id {shop_id} to {status}")
                except SQLAlchemyError as e:
                    logger.error(f"Database error in update_setup_completed_status for shop {shop_id}: {e}", exc_info=True)
                    raise