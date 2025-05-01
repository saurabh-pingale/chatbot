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

    async def store_checkout_product(self, shop_id: str, user_email: str, product_id: int, product_count: int):
        """Stores checkout product information in the database."""
        async with self.Session() as session:
            try:
                store = await session.execute(select(StoreModel).filter(StoreModel.shop_id == shop_id))
                store_id = store.scalars().first()
                if not store_id:
                    raise ValueError("Store not found")

                user = await session.execute(select(UserModel).filter(UserModel.email == user_email))
                user_id = user.scalars().first()
                if not user_id:
                    raise ValueError("User not found")

                product = await session.execute(select(ProductModel).filter(ProductModel.id == product_id))
                product_record = product.scalars().first()
                if not product_record:
                    raise ValueError("Product not found")

                collection_id = await product_record.collection_id
                if not collection_id:
                    raise ValueError("Collection not found")

                stmt = insert(CheckoutProductModel).values(
                    store_id=store_id.id,
                    user_id=user_id.id,
                    product_id=product_record.id,
                    collection_id=collection_id.id,
                    product_count=product_count
                )
                await session.execute(stmt)
                await session.commit()
                logger.info(f"Checkout product saved: Store {shop_id}, User {user_email}, Product {product_id}")
                return {"success": True}

            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"Error storing checkout product: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}

    async def remove_checkout_product(self, product_id: int):
        """Removes a checkout product entry by user and product title."""
        async with self.Session() as session:
            try:
                product = await session.execute(select(ProductModel).filter(ProductModel.id == product_id))
                product_record = product.scalars().first()
                if not product_record:
                    raise ValueError("Product not found")

                stmt = delete(CheckoutProductModel).where(
                    CheckoutProductModel.product_id == product_id
                )
                result = await session.execute(stmt)
                await session.commit()

                if result.rowcount == 0:
                    return {"success": False, "error": "No matching product in cart"}

                logger.info(f"Removed product '{product_id}' from checkout cart.")
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"SQLAlchemy error during product removal: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Validation error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}