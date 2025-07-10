from sqlalchemy import select, func, Date
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime
from typing import Optional, Tuple, Dict

from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.user_handler import UserHandler
from app.models.db.shop_admin import UserModel, ShopModel, UserShopAnalyticsModel
from app.models.api.shop_admin import UTMParameters
from app.utils.analytics_utils import update_user_location_if_missing
from app.utils.logger import logger

class AnalyticsHandler:
    def __init__(self):
        self.user_handler = UserHandler()

    async def get_shop_pk(self, shop_id: str) -> Optional[int]:
        """Fetches the integer primary key of a shop by its public string ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    stmt = select(ShopModel.id).where(ShopModel.shop_id == shop_id)
                    result = await session.execute(stmt)
                    shop_pk = result.scalar_one_or_none()
                    if not shop_pk:
                        return None
                    return shop_pk
                except SQLAlchemyError as e:
                    logger.error(f"DB error fetching shop PK for {shop_id}: {e}", exc_info=True)
                    return None

    async def _get_or_create_analytics_record(
        self,
        shop_id: int,
        user_id: Optional[int] = None,
        guest_id: Optional[str] = None,
        utm_params: Optional[UTMParameters] = None
    ) -> Optional[UserShopAnalyticsModel]:
        """
        Atomically retrieves or creates an analytics record for the current day for a user or guest.
        This function is safe from race conditions due to the 'ON CONFLICT DO NOTHING' clause
        targeting the correct partial unique index.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                today = datetime.now().date()

                if not user_id and not guest_id:
                    logger.error("Both user_id and guest_id are None. Cannot create analytics record.")
                    return None

                insert_values = {"shop_id": shop_id, "date": today}
                if user_id:
                    insert_values["user_id"] = user_id
                else:
                    insert_values["guest_id"] = guest_id

                if utm_params:
                    insert_values.update({
                        "utm_source": utm_params.utm_source or 'direct', "utm_medium": utm_params.utm_medium,
                        "utm_campaign": utm_params.utm_campaign, "utm_term": utm_params.utm_term,
                        "utm_content": utm_params.utm_content
                    })
                else:
                    insert_values.setdefault("utm_source", 'direct')

                stmt = pg_insert(UserShopAnalyticsModel).values(insert_values)

                if user_id:
                    conflict_target = ['user_id', 'shop_id', 'date']
                    index_where = UserShopAnalyticsModel.user_id.isnot(None)
                else: 
                    conflict_target = ['guest_id', 'shop_id', 'date']
                    index_where = UserShopAnalyticsModel.guest_id.isnot(None)

                stmt = stmt.on_conflict_do_nothing(
                    index_elements=conflict_target,
                    index_where=index_where
                )
                await session.execute(stmt)

                select_stmt = select(UserShopAnalyticsModel).where(
                    UserShopAnalyticsModel.shop_id == shop_id, UserShopAnalyticsModel.date == today
                )
                if user_id:
                    select_stmt = select_stmt.where(UserShopAnalyticsModel.user_id == user_id)
                else:
                    select_stmt = select_stmt.where(UserShopAnalyticsModel.guest_id == guest_id)

                result = await session.execute(select_stmt)
                return result.scalar_one_or_none()

    async def _update_user_location(self, user_id: int, shop_id: int, country: Optional[str], region: Optional[str], city: Optional[str], ip_address: Optional[str]):
        """Fetches a user and updates their location information if it's missing."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await session.get(UserModel, user_id, options=[selectinload(UserModel.analytics)])
                if not user:
                    logger.error(f"User with id {user_id} not found. Cannot update location.")
                    return

                if user.shop_id != shop_id:
                    logger.error(f"CRITICAL: User {user_id} (shop_id: {user.shop_id}) does not belong to the shop_id {shop_id}. Aborting location update.")
                    return

                update_user_location_if_missing(user, country, region, city, ip_address)

    async def get_or_create_user_for_token(self, email: str, shop_id: str, utm_params: Optional[UTMParameters] = None) -> Optional[Dict[str, any]]:
        """
        Handles user initiation: gets/creates a user, ensures an analytics record exists,
        and returns primary keys required for creating a JWT token.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id)
                    if not shop_pk:
                        return None
                    
                    user, _ = await self.user_handler.get_or_create_user(email, shop_pk)
                    if not user:
                        logger.error(f"Failed to get/create user for email {email}, shop {shop_id}")
                        return None

                    await self._get_or_create_analytics_record(shop_id=shop_pk, user_id=user.id, utm_params=utm_params)

                    return {"user_id": user.id, "shop_id": shop_pk}
                except (SQLAlchemyError, ValueError) as e:
                    logger.error(f"Error during user processing for {email}, {shop_id}: {e}", exc_info=True)
                    return None
    
    async def update_user_chat_analytics(
        self, 
        shop_id: int, 
        user_id: Optional[int] = None,
        guest_id: Optional[str] = None,
        country: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Updates chat analytics. For identified users, it also updates their location.
        For anonymous users, it increments the interaction count on the shared anonymous record.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    if user_id:
                        await self._update_user_location(user_id, shop_id, country, region, city, ip_address)

                    analytics_record = await self._get_or_create_analytics_record(shop_id=shop_id, user_id=user_id, guest_id=guest_id)

                    if analytics_record:
                        analytics_record.chat_interactions_count += 1
                        logger.info(f"Incremented chat_interactions_count for {'guest' if guest_id else 'user'}:{guest_id or user_id}, shop_id:{shop_id}")
                    else:
                        logger.error(f"Failed to find/create analytics record for user:{user_id}/guest:{guest_id}, shop:{shop_id}")
                        return False
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB error in update_user_chat_analytics for user:{user_id}/guest:{guest_id}, shop:{shop_id}: {e}", exc_info=True)
                    return False
                
    async def increment_opened_chatbot_count(self, identifier: str, shop_id: str, utm_params: Optional[UTMParameters] = None, is_guest: bool = False) -> bool:
        """
        Increments the chatbot open count. Handles both anonymous and identified users.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id)
                    if not shop_pk: return False

                    user_pk, guest_id_val = (None, identifier) if is_guest else (None, None)
                    if not is_guest:
                        user = await self.user_handler.get_user_by_email_and_shop_id(email=identifier, shop_id=shop_pk)
                        if user: user_pk = user.id
                        else: guest_id_val = identifier

                    analytics_record = await self._get_or_create_analytics_record(
                        shop_id=shop_pk, 
                        user_id=user_pk, 
                        guest_id=guest_id_val, 
                        utm_params=utm_params
                    )
                    
                    if analytics_record:
                        analytics_record.opened_chatbot_count += 1
                        
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB error in increment_opened_chatbot_count: {e}", exc_info=True)
                    await session.rollback()
                    return False

    async def increment_added_to_cart_count(self, shop_id: int, user_id: Optional[int] = None, guest_id: Optional[str] = None) -> bool:
        """Increments the count of how many times a user has added a product to the cart."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    analytics_record = await self._get_or_create_analytics_record(shop_id, user_id, guest_id)
                    if analytics_record:
                        analytics_record.added_to_cart_count += 1
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB error incrementing added_to_cart_count for user {user_id}/guest {guest_id}, shop {shop_id}: {e}", exc_info=True)
                    return False

    async def increment_purchased_count(self, shop_id: int, amount: float, user_id: Optional[int] = None, guest_id: Optional[str] = None) -> bool:
        """Increments the purchase count and adds the purchase amount for a user."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    analytics_record = await self._get_or_create_analytics_record(shop_id, user_id, guest_id)
                    if analytics_record:
                        analytics_record.purchased_count += 1
                        analytics_record.purchase_amount += amount
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB error incrementing purchased_count for user {user_id}/guest {guest_id}, shop {shop_id}: {e}", exc_info=True)
                    return False

    async def increment_purchased_count_by_email(self, email: str, shop_id: str, amount: float, order_id: str) -> bool:
        """
        Finds a user by email and shop identifier (or creates them if they don't exist)
        and increments their purchase analytics for today. This is designed to be called 
        from a webhook where we may not have our internal user_id.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id)
                    if not shop_pk: return False
                    
                    user, _ = await self.user_handler.get_or_create_user(email, shop_pk)
                    if not user: return False

                    analytics_record = await self._get_or_create_analytics_record(shop_id=shop_pk, user_id=user.id)
                    if not analytics_record: return False
                    
                    analytics_record.purchased_count += 1
                    analytics_record.purchase_amount = (analytics_record.purchase_amount or 0) + amount
                    
                    logger.info(f"Successfully tracked purchase for order {order_id} for user {user.id} on shop {shop_pk}. New total purchases: {analytics_record.purchased_count}, New total amount: {analytics_record.purchase_amount}")
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB Error tracking purchase by email for {email}, shop {shop_id}: {e}", exc_info=True)
                    return False

    async def get_shop_analytics_summary(self, shop_id: str, start_date: Optional[Date], end_date: Optional[Date]) -> Optional[Dict[str, any]]:
        """
        Fetches aggregated analytics and daily chatbot open data for a given shop.
        """
        async with AsyncSessionLocal() as session:
            try:
                shop_pk = await self.get_shop_pk(shop_id)
                if not shop_pk: return None

                summary_query = select(
                    func.count(func.distinct(UserShopAnalyticsModel.user_id)).label('total_users'),
                    func.sum(UserShopAnalyticsModel.chat_interactions_count).label('total_chat_interactions'),
                    func.sum(UserShopAnalyticsModel.opened_chatbot_count).label('total_opened_chatbot'),
                    func.sum(UserShopAnalyticsModel.added_to_cart_count).label('total_added_to_cart'),
                    func.sum(UserShopAnalyticsModel.purchased_count).label('total_purchased'),
                    func.sum(UserShopAnalyticsModel.purchase_amount).label('total_purchase_amount')
                ).where(UserShopAnalyticsModel.shop_id == shop_pk)

                daily_query = select(
                    UserShopAnalyticsModel.date,
                    func.sum(UserShopAnalyticsModel.opened_chatbot_count).label('daily_opens')
                ).where(UserShopAnalyticsModel.shop_id == shop_pk).group_by(UserShopAnalyticsModel.date).order_by(UserShopAnalyticsModel.date)

                if start_date:
                    summary_query = summary_query.where(UserShopAnalyticsModel.date >= start_date)
                    daily_query = daily_query.where(UserShopAnalyticsModel.date >= start_date)
                if end_date:
                    summary_query = summary_query.where(UserShopAnalyticsModel.date <= end_date)
                    daily_query = daily_query.where(UserShopAnalyticsModel.date <= end_date)

                summary_result = await session.execute(summary_query)
                summary = summary_result.first()

                daily_result = await session.execute(daily_query)
                daily_data = [{"date": row.date.isoformat(), "count": row.daily_opens or 0} for row in daily_result]

                return {
                    "total_users": summary.total_users or 0,
                    "total_chat_interactions": summary.total_chat_interactions or 0,
                    "total_opened_chatbot": summary.total_opened_chatbot or 0,
                    "total_added_to_cart": summary.total_added_to_cart or 0,
                    "total_purchased": summary.total_purchased or 0,
                    "total_purchase_amount": summary.total_purchase_amount or 0.0,
                    "daily_opened_chatbot": daily_data
                }
            except SQLAlchemyError as e:
                logger.error(f"DB error in get_shop_analytics_summary for shop {shop_id}: {e}", exc_info=True)
                return {"error": "A database error occurred."}