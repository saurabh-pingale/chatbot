from sqlalchemy.exc import SQLAlchemyError
import uuid

from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.user_handler import UserHandler
from app.models.db.order import OrderModel, OrderItemModel 
from app.utils.logger import logger

class WebhookHandler:
    def __init__(self):
        self.analytics_handler = AnalyticsHandler()
        self.user_handler = UserHandler()

    async def increment_purchased_count_by_email(self, email: str, shop_id: str, amount: float, order_id: str) -> bool:
        """
        Finds a user by email and shop identifier (or creates them if they don't exist)
        and increments their purchase analytics for today. This is designed to be called 
        from a webhook where we may not have our internal user_id.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.analytics_handler.get_shop_pk(shop_id, session)
                    if not shop_pk: return False
                    
                    user, _ = await self.user_handler.get_or_create_user(email, shop_pk)
                    if not user: return False

                    success = await self.analytics_handler._increment_analytics_counts(
                        session,
                        shop_id=shop_pk,
                        user_id=user.id,
                        guest_id=None,
                        purchased_count=1,
                        purchase_amount=amount
                    )

                    if success:
                        logger.info(f"Successfully tracked purchase for order {order_id} for user {user.id} on shop {shop_pk}.")
                    else:
                        logger.error(f"Failed to track purchase for order {order_id} via _increment_analytics_counts.")

                    return success
                except SQLAlchemyError as e:
                    logger.error(f"DB Error tracking purchase by email for {email}, shop {shop_id}: {e}", exc_info=True)
                    return False
                
    async def store_detailed_order_from_webhook(self, payload: dict, shop_id_str: str, user_id: uuid.UUID) -> bool:
        """
        Parses a Shopify order payload and stores detailed information
        in the OrderModel and OrderItemModel tables.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id_str, session)
                    if not shop_pk:
                        logger.error(f"Could not find shop_pk for shop: {shop_id_str}")
                        return False

                    shipping_addr_data = payload.get('shipping_address', {})
                    shipping_address_parts = [
                        shipping_addr_data.get('address1'),
                        shipping_addr_data.get('address2'),
                        shipping_addr_data.get('city'),
                        shipping_addr_data.get('province_code'),
                        shipping_addr_data.get('zip'),
                        shipping_addr_data.get('country')
                    ]
                    formatted_address = ", ".join(filter(None, shipping_address_parts))

                    new_order = OrderModel(
                        shopify_order_id=payload['id'],
                        total_price=float(payload['total_price']),
                        customer_name=f"{payload.get('customer', {}).get('first_name', '')} {payload.get('customer', {}).get('last_name', '')}".strip(),
                        customer_email=payload['customer']['email'],
                        shipping_address=formatted_address,
                        phone_number=payload.get('phone') or shipping_addr_data.get('phone'),
                        user_id=user_id,
                        shop_id=shop_pk,
                    )
                    session.add(new_order)
                    await session.flush()

                    for item in payload.get('line_items', []):
                        order_item = OrderItemModel(
                            order_id=new_order.id,
                            product_variant_id=item.get('variant_id'),
                            quantity=item['quantity'],
                            price_per_item=float(item['price']),
                            product_title=item['title'],
                        )
                        session.add(order_item)

                    logger.info(f"Successfully stored detailed order {new_order.shopify_order_id} for user {user_id}")
                    return True

                except SQLAlchemyError as e:
                    logger.error(f"DB Error storing detailed order for shop {shop_id_str}: {e}", exc_info=True)
                    await session.rollback()
                    return False
                except KeyError as e:
                    logger.error(f"Webhook payload was missing an expected key: {e}", exc_info=True)
                    await session.rollback()
                    return False    