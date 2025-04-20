from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.models.db.store_admin import Base, ProductModel, StoreModel, CollectionModel
from app.models.api.store_admin import (Collection, ProductRequest)
from app.config import DATABASE_URL
from app.utils.logger import logger

#TODO - Tried using new db url its not working, once check
class StoreAdminHandler:
    def __init__(self):
        database_url = DATABASE_URL

        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")
        self.engine = create_async_engine(database_url, echo=True)
        self.Session = sessionmaker(bind=self.engine, class_=AsyncSession, expire_on_commit=False)

        #TODO - create_all() should be in start_event() in routes, ask chatgpt
        self.create_all()

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

                titles = [c.title for c in collections]
                stmt = select(CollectionModel).where(CollectionModel.title.in_(titles))
                existing_collections = await session.execute(stmt)
                collections_list = existing_collections.scalars().all()

                existing_map = {c.title: c for c in collections_list}

                to_insert = []
                for collection in collections:
                    if collection.title in existing_map:
                        existing_map[collection.title].products_count = collection.products_count
                        result.append({
                            "title": collection.title,
                            "products_count": collection.products_count,
                            "id": existing_map[collection.title].id
                        })
                    else:
                        new_collection = CollectionModel(
                            title=collection.title,
                            products_count=collection.products_count
                        )
                        to_insert.append(new_collection)

                if to_insert:
                    session.add_all(to_insert)
                    await session.commit()

                return result

            except SQLAlchemyError as error:
                logger.error("Database error in store_collections: %s", str(error), exc_info=True)
                raise error

    async def store_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int]) -> None:
        """Stores products in the database and links them to collections using bulk insert."""
        async with self.Session() as session:
            try:
                product_objs = []

                for product in products:
                    col_id = collection_id_map.get(product.category)
                    product_obj = ProductModel(
                        title=product.title,
                        description=product.description,
                        category=product.category,
                        url=product.url,
                        price=float(product.price) if product.price else None,
                        image=product.image,
                        collection_id=col_id if col_id else None
                    )
                    product_objs.append(product_obj)

                session.add_all(product_objs)
                await session.commit()

            except Exception as error:
                logger.error("Supabase error in store_products: %s", str(error), exc_info=True)
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