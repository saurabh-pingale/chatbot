from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, delete, update
import uuid

from app.models.db.shop_admin import ProductModel
from app.models.db.checkout_product import CheckoutProductModel
from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.external_service.shopify_service import ShopifyService
from app.utils.logger import logger

class CheckoutProductHandler:
    def __init__(self):
        self.analytics_handler = AnalyticsHandler()
        self.shop_config_handler = ShopConfigHandler()

    #TODO P0: If we are raising ValueError, Are these errors are correctly showing in frontend, needs to test and check on it.
    async def store_checkout_product(self, shop_id: str, user_id: uuid.UUID, variant_id: int, product_count: int):
        """Stores checkout product information in the database."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_pk:
                        raise ValueError("Shop not found")
                    
                    if not user_id:
                        raise ValueError("user_id must be provided")

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
                        "product_count": product_count,
                        "user_id": user_id,
                    }

                    stmt = insert(CheckoutProductModel).values(**insert_data)

                    update_stmt = stmt.on_conflict_do_update(
                        index_elements=['shop_id', 'variant_id', 'user_id'],
                        set_=dict(product_count=product_count)
                    )
                    
                    await session.execute(update_stmt)
                    await session.commit()
                    return {"success": True}

                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error(f"Error storing checkout product: {error}", exc_info=True)
                    return {"success": False, "error": str(error)}
                except ValueError as error:
                    logger.error(f"Error: {error}", exc_info=True)
                    return {"success": False, "error": str(error)}

    async def remove_checkout_product(self, shop_id: str, user_id: uuid.UUID, variant_id: int):
        """Removes a checkout product entry"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    #TODO P0: We need to keep below store checking verification in the middleware as well 
                    shop_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_pk:
                        raise ValueError("Shop not found")
    
                    stmt = delete(CheckoutProductModel).where(
                        CheckoutProductModel.shop_id == shop_pk,
                        CheckoutProductModel.variant_id == variant_id,
                        CheckoutProductModel.user_id == user_id
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
                
    async def get_latest_inventory(self, shop_id: str, shop_pk: int, variant_id: int, session):
        """
        Fetch the latest inventory quantity for a specific product variant and sync to DB.
        """
        try:
            access_token = await self.shop_config_handler.get_shopify_access_token(shop_id, session)
            shopify_service = ShopifyService(shop_id, access_token)
            latest_quantity = await shopify_service.fetch_variant_inventory(variant_id)

            update_stmt = update(ProductModel).where(
                ProductModel.shop_id == shop_pk,
                ProductModel.variant_id == variant_id
            ).values(variant_quantity=latest_quantity)

            result = await session.execute(update_stmt)
            if result.rowcount == 0: 
                logger.warning(f"No products found to update inventory for variant: {variant_id} in shop {shop_id}")
            await session.commit()

            return latest_quantity
        except SQLAlchemyError as error:
            await session.rollback()
            logger.error(f"Database error updating inventory: {error}", exec_info=True)
            raise ValueError("Database error while updating product inventory.")
        except ValueError as error:
            logger.error(f"Validation error fetching inventory: {error}", exc_info=True)
            raise ValueError(str(error))