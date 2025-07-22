from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, delete, exists
from typing import Optional

from app.models.db.shop_admin import ProductModel
from app.models.db.checkout_product import CheckoutProductModel
from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.utils.logger import logger

class CheckoutProductHandler:
    def __init__(self):
        self.analytics_handler = AnalyticsHandler()
        pass

    async def store_checkout_product(self, shop_id: str, user_id: Optional[int], guest_id: Optional[str], variant_id: int, product_count: int):
        """Stores checkout product information in the database."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.analytics_handler.get_shop_pk(shop_id)
                    if not shop_pk:
                        raise ValueError("Shop not found")
                    
                    if not user_id and not guest_id:
                        raise ValueError("Either user_id or guest_id must be provided")

                    product = await session.execute(select(ProductModel).filter(ProductModel.variant_id == variant_id))
                    product_record = product.scalars().first()
                    if not product_record:
                        raise ValueError("Product not found")

                    collection_id = product_record.collection_id
                    if not collection_id:
                        raise ValueError("Collection not found")
                    
                    insert_data = {
                        "shop_id": shop_pk,
                        "variant_id": product_record.variant_id,
                        "collection_id": collection_id,
                        "product_count": product_count
                    }

                    if user_id:
                        insert_data["user_id"] = user_id
                    elif guest_id:
                        insert_data["guest_id"] = guest_id

                    stmt = insert(CheckoutProductModel).values(**insert_data)
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

    async def remove_checkout_product(self, variant_id: int):
        """Removes a checkout product entry"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    product_exists = await session.execute(
                        select(exists().where(ProductModel.variant_id == variant_id))
                    )
                    if not product_exists.scalar():
                        raise ValueError("Product not found")
    
                    stmt = delete(CheckoutProductModel).where(
                        CheckoutProductModel.variant_id == variant_id
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