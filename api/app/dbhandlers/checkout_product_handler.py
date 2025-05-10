from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, delete, exists

from app.models.db.shop_admin import ProductModel, ShopModel, UserModel
from app.models.db.checkout_product import CheckoutProductModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class CheckoutProductHandler:
    def __init__(self):
        pass

    async def store_checkout_product(self, shop_id: str, user_email: str, product_id: int, product_count: int):
        """Stores checkout product information in the database."""
        async with AsyncSessionLocal() as session:
            try:
                shop = await session.execute(select(ShopModel).filter(ShopModel.shop_id == shop_id))
                shop_id = shop.scalars().first()
                if not shop_id:
                    raise ValueError("Shop not found")

                user = await session.execute(select(UserModel).filter(UserModel.email == user_email))
                user_id = user.scalars().first()
                if not user_id:
                    raise ValueError("User not found")

                product = await session.execute(select(ProductModel).filter(ProductModel.id == product_id))
                product_record = product.scalars().first()
                if not product_record:
                    raise ValueError("Product not found")

                collection_id = product_record.collection_id
                if not collection_id:
                    raise ValueError("Collection not found")

                stmt = insert(CheckoutProductModel).values(
                    shop_id=shop_id.id,
                    user_id=user_id.id,
                    product_id=product_record.id,
                    collection_id=collection_id,
                    product_count=product_count
                )
                await session.execute(stmt)
                await session.commit()
                return {"success": True}

            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"Error storing checkout product: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}

    async def remove_checkout_product(self, product_id: int):
        """Removes a checkout product entry by user and product id."""
        async with AsyncSessionLocal() as session:
            try:
                product_exists = await session.execute(
                    select(exists().where(ProductModel.id == product_id))
                )
                if not product_exists.scalar():
                    raise ValueError("Product not found")

                stmt = delete(CheckoutProductModel).where(
                    CheckoutProductModel.product_id == product_id
                )
                result = await session.execute(stmt)
                await session.commit()

                if result.rowcount == 0:
                    return {"success": False, "error": "No matching product in cart"}
                    
                return {"success": True}
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error(f"SQLAlchemy error during product removal: {error}", exc_info=True)
                return {"success": False, "error": str(error)}
            except ValueError as error:
                logger.error(f"Validation error: {error}", exc_info=True)
                return {"success": False, "error": str(error)}