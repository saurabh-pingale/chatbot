from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.db.store_admin import Base, ProductModel, StoreModel, CollectionModel
from app.models.api.store_admin import (ProductRequest)
from app.config import DATABASE_URL
from app.utils.logger import logger

class StoreAdminHandler:
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
                store = await session.execute(
                    select(StoreModel).filter_by(id=shop_id)
                )
                store = store.scalars().first()
                if not store:
                    logger.warning(f"No color preference found for shop: {shop_id}, returning default")
                    return None
                return store.preferred_color
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

    async def get_support_contact(self, store_name: str) -> Optional[dict]:
        """Fetches support email and phone for a given store name."""
        async with self.Session() as session:
            try:
                store = await session.execute(
                    select(StoreModel).filter(StoreModel.store_name == store_name)
                )
                store = store.scalars().first()
                logger.info(f"Store: {store}")
                if not store:
                    logger.warning(f"No store found with name: {store_name}")
                    return None

                return {
                    "support_email": store.support_email,
                    "support_phone": store.support_phone
                }
            except SQLAlchemyError as error:
                logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                raise error
            
    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Saves the color preference for a given shop ID."""
        async with self.Session() as session:
            try:
                store = await session.execute(
                    select(StoreModel).where(StoreModel.store_name == shop_id)
                )
                store = store.scalars().first()

                if not store:
                    store = StoreModel(store_name=shop_id)
                    session.add(store)

                store.preferred_color = color
                await session.commit()
                logger.info(f"Color preference saved for shop: {shop_id}")

            except SQLAlchemyError as error:
                logger.error("Database error in save_color_preference: %s", str(error), exc_info=True)
                raise error
            
    async def save_support_info(self, shop_id: str, email: str, phone: str) -> dict:
        async with self.Session() as session:
            try:
                result = await session.execute(
                    select(StoreModel).where(StoreModel.store_name == shop_id)
                )
                store = result.scalars().first()
                if not store:
                    store = StoreModel(store_name=shop_id)
                    session.add(store)

                store.support_email = email
                store.support_phone = phone

                await session.commit()
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error("Error saving support info: %s", str(error), exc_info=True)
                raise

    async def save_store_image(self, shop_id: str, image_url: str) -> dict:
        """Saves the image URL for a given store."""
        async with self.Session() as session:
            try:
                result = await session.execute(
                    select(StoreModel).where(StoreModel.store_name == shop_id)
                )
                store = result.scalars().first()
                if not store:
                    store = StoreModel(store_name=shop_id)
                    session.add(store)

                store.image = image_url
                await session.commit()
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error("Error saving store image: %s", str(error), exc_info=True)
                return {"success": False}

    async def get_image(self, store_name: str) -> Optional[dict]:
        """Fetches image for a given store name."""
        async with self.Session() as session:
            try:
                store = await session.execute(
                    select(StoreModel).filter(StoreModel.store_name == store_name)
                )
                store = store.scalars().first()
                if not store:
                    logger.warning(f"No store found with name: {store_name}")
                    return None

                return store.image
            except SQLAlchemyError as error:
                logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                raise error
    