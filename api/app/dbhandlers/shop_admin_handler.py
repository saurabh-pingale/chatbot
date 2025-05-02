from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.db.shop_admin import Base, ProductModel, ShopModel, CollectionModel
from app.models.api.shop_admin import (ProductRequest)
from app.config import DATABASE_URL
from app.utils.logger import logger


class ShopAdminHandler:
    def __init__(self):
        database_url = DATABASE_URL
        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")
        
        self.engine = create_async_engine(database_url, echo=True)
        self.Session = sessionmaker(bind=self.engine, class_=AsyncSession, expire_on_commit=False)

    async def create_all(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)   

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetches color preference for a given shop ID."""
        async with self.Session() as session:
            try:
                shop = await session.execute(
                    select(ShopModel).filter(ShopModel.shop_id == shop_id)
                )
                shop = shop.scalars().first()
                if not shop:
                    logger.warning(f"No color preference found for shop: {shop_id}, returning default")
                    return None
                return shop.preferred_color
            except SQLAlchemyError as error:
                logger.error("Database error in get_color_preference: %s", str(error), exc_info=True)
                raise error

    async def store_collections(self, collections: List[CollectionModel]) -> List[dict]:
        """Stores collections in the database using bulk operations."""
        async with self.Session() as session:
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
                await session.commit()

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

    async def store_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int]) -> None:
        """Stores products in the database and links them to collections using bulk insert."""
        async with self.Session() as session:
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
                        'collection_id': col_id if col_id else None
                    })
                
                stmt = insert(ProductModel).values(insert_data)
                
                stmt = stmt.on_conflict_do_update(
                    index_elements=['title', 'category'], 
                    set_={
                        'description': stmt.excluded.description,
                        'category': stmt.excluded.category,
                        'url': stmt.excluded.url,
                        'price': stmt.excluded.price,
                        'image': stmt.excluded.image,
                        'collection_id': stmt.excluded.collection_id
                    }
                )

                await session.execute(stmt)
                await session.commit()

            except Exception as error:
                logger.error("Error in store_products: %s", str(error), exc_info=True)
                raise error

    async def get_support_contact(self, shop_id: str) -> Optional[dict]:
        """Fetches support email and phone for a given shop name."""
        async with self.Session() as session:
            try:
                shop = await session.execute(
                    select(ShopModel).filter(ShopModel.shop_id == shop_id)
                )
                shop = shop.scalars().first()
                if not shop:
                    logger.warning(f"No shop found with name: {shop_id}")
                    return None

                return {
                    "support_email": shop.support_email,
                    "support_phone": shop.support_phone
                }
            except SQLAlchemyError as error:
                logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                raise error
            
    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Saves the color preference for a given shop ID."""
        async with self.Session() as session:
            try:
                shop = await session.execute(
                    select(ShopModel).where(ShopModel.shop_id == shop_id)
                )
                shop = shop.scalars().first()

                if not shop:
                    shop = ShopModel(shop_id=shop_id)
                    session.add(shop)

                shop.preferred_color = color
                await session.commit()

            except SQLAlchemyError as error:
                logger.error("Database error in save_color_preference: %s", str(error), exc_info=True)
                raise error
            
    async def save_support_info(self, shop_id: str, email: str, phone: str) -> dict:
        async with self.Session() as session:
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

                await session.commit()
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error("Error saving support info: %s", str(error), exc_info=True)
                raise

    async def save_shop_image(self, shop_id: str, image_url: str) -> dict:
        """Saves the image URL for a given shop."""
        async with self.Session() as session:
            try:
                result = await session.execute(
                    select(ShopModel).where(ShopModel.shop_id == shop_id)
                )
                shop = result.scalars().first()
                if not shop:
                    shop = ShopModel(shop_id=shop_id)
                    session.add(shop)

                shop.image = image_url
                await session.commit()
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error("Error saving shop image: %s", str(error), exc_info=True)
                return {"success": False}

    async def get_image(self, shop_id: str) -> Optional[dict]:
        """Fetches image for a given shop id."""
        async with self.Session() as session:
            try:
                shop = await session.execute(
                    select(ShopModel).filter(ShopModel.shop_id == shop_id)
                )
                shop = shop.scalars().first()
                if not shop:
                    logger.warning(f"No shop found with name: {shop_id}")
                    return None

                return shop.image
            except SQLAlchemyError as error:
                logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                raise error