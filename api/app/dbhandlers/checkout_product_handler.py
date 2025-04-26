from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, delete

from app.models.db.store_admin import Base, ProductModel, StoreModel, CollectionModel, UserModel
from app.models.db.checkout_product import CheckoutProductModel
from app.config import DATABASE_URL
from app.utils.logger import logger

class CheckoutProductHandler:
    def __init__(self):
        database_url = DATABASE_URL
        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")
        
        self.engine = create_async_engine(database_url, echo=True)
        self.Session = sessionmaker(bind=self.engine, class_=AsyncSession, expire_on_commit=False)

    async def create_all(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)   

    
    async def store_checkout_product(self, store_name: str, user_email: str, product_name: str, collection_title: str, product_count: int):
        """Stores checkout product information in the database."""
        async with self.Session() as session:
            try:
                store = await session.execute(select(StoreModel).filter(StoreModel.store_name == store_name))
                store_id = store.scalars().first()
                if not store_id:
                    raise ValueError("Store not found")

                user = await session.execute(select(UserModel).filter(UserModel.email == user_email))
                user_id = user.scalars().first()
                if not user_id:
                    raise ValueError("User not found")

                product = await session.execute(select(ProductModel).filter(ProductModel.title == product_name))
                product_id = product.scalars().first()
                if not product_id:
                    raise ValueError("Product not found")

                collection = await session.execute(select(CollectionModel).filter(CollectionModel.title == collection_title))
                collection_id = collection.scalars().first()
                if not collection_id:
                    raise ValueError("Collection not found")

                stmt = insert(CheckoutProductModel).values(
                    store_id=store_id.id,
                    user_id=user_id.id,
                    product_id=product_id.id,
                    collection_id=collection_id.id,
                    product_count=product_count
                )
                await session.execute(stmt)
                await session.commit()
                logger.info(f"Checkout product saved: Store {store_name}, User {user_email}, Product {product_name}")
                return {"success": True}

            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"Error storing checkout product: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}

    async def remove_checkout_product(self, product_title: str):
        """Removes a checkout product entry by user and product title."""
        async with self.Session() as session:
            try:
                product = await session.execute(select(ProductModel).filter(ProductModel.title == product_title))
                product_id = product.scalars().first()
                if not product_id:
                    raise ValueError("Product not found")

                stmt = delete(CheckoutProductModel).where(
                    CheckoutProductModel.product_id == product_id.id
                )
                result = await session.execute(stmt)
                await session.commit()

                if result.rowcount == 0:
                    return {"success": False, "error": "No matching product in cart"}

                logger.info(f"Removed product '{product_title}' from checkout cart.")
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"SQLAlchemy error during product removal: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Validation error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}