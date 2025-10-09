from sqlalchemy import select, func, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime, time, timezone
from typing import Optional, Dict

from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.user_handler import UserHandler
from app.models.db.shop_admin import UserModel, ShopModel, UserShopAnalyticsModel, UserShopMinutelyAnalyticsModel
from app.models.api.shop_admin import UTMParameters
from app.constants import MIN_DATAPOINTS_FOR_HOURLY_GRANULARITY, HOURLY_GRANULARITY_THRESHOLD_HOURS, SECONDS_IN_A_DAY
from app.utils.analytics_utils import update_user_location_if_missing
from app.utils.logger import logger

class AnalyticsHandler:
    def __init__(self):
        self.user_handler = UserHandler()

    async def get_shop_pk(self, shop_id: str, session) -> Optional[int]:
        """Fetches the integer primary key of a shop by its public string ID."""
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
        session: AsyncSession,
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
        try:
            today = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())

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
                
        except SQLAlchemyError as e:
            logger.exception(f"Database error while getting or creating analytics record: {e}")
            await session.rollback()
            return None
        
    async def _get_or_create_minutely_analytics_record(
        self,
        session: AsyncSession,
        shop_id: int,
        user_id: Optional[int] = None,
        guest_id: Optional[str] = None,
    ) -> Optional[UserShopMinutelyAnalyticsModel]:
        """Atomically retrieves or creates a MINUTELY analytics record for a user or guest."""
        try:
            now = datetime.now()
            start_of_minute_ts = int(now.replace(second=0, microsecond=0).timestamp())
            start_of_day_ts = int(now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())

            if not user_id and not guest_id: return None

            insert_values = {
                "shop_id": shop_id, 
                "minute_timestamp": start_of_minute_ts, 
                "date": start_of_day_ts,
                "user_id": user_id,
                "guest_id": guest_id
            }

            stmt = pg_insert(UserShopMinutelyAnalyticsModel).values(insert_values)
            conflict_target = ['user_id' if user_id else 'guest_id', 'shop_id', 'minute_timestamp']
            index_where = UserShopMinutelyAnalyticsModel.user_id.isnot(None) if user_id else UserShopMinutelyAnalyticsModel.guest_id.isnot(None)
            stmt = stmt.on_conflict_do_nothing(index_elements=conflict_target, index_where=index_where)
            await session.execute(stmt)

            select_stmt = select(UserShopMinutelyAnalyticsModel).where(
                UserShopMinutelyAnalyticsModel.shop_id == shop_id, 
                UserShopMinutelyAnalyticsModel.minute_timestamp == start_of_minute_ts
            )
            select_stmt = select_stmt.where(UserShopMinutelyAnalyticsModel.user_id == user_id) if user_id else select_stmt.where(UserShopMinutelyAnalyticsModel.guest_id == guest_id)

            result = await session.execute(select_stmt)
            return result.scalar_one_or_none()
            
        except SQLAlchemyError as e:
            logger.exception(f"Database error while getting or creating minutely analytics record: {e}")
            return None
        
    async def _increment_analytics_counts(
        self,
        session: AsyncSession,
        shop_id: int,
        user_id: Optional[int],
        guest_id: Optional[str],
        utm_params: Optional[UTMParameters] = None, **kwargs
    ):
        """Generic helper to increment counts on both daily and minutely tables."""
        try:
            # Daily Record
            daily_record = await self._get_or_create_analytics_record(session, shop_id, user_id, guest_id, utm_params)
            if daily_record:
                for key, value in kwargs.items():
                    current_value = getattr(daily_record, key) or 0
                    setattr(daily_record, key, current_value + value)
                session.add(daily_record)

            # Minutely Record
            minutely_record = await self._get_or_create_minutely_analytics_record(session, shop_id, user_id, guest_id)
            if minutely_record:
                for key, value in kwargs.items():
                    if hasattr(minutely_record, key):
                        current_value = getattr(minutely_record, key) or 0
                        setattr(minutely_record, key, current_value + value)
                session.add(minutely_record)

            return True
        except SQLAlchemyError as e:
            logger.error(f"DB error in _increment_analytics_counts for user:{user_id}/guest:{guest_id}: {e}", exc_info=True)
            return False

    async def _update_user_location(self, user_id: int, shop_id: int, country: Optional[str], region: Optional[str], city: Optional[str], ip_address: Optional[str]):
        """Fetches a user and updates their location information if it's missing."""
        try:
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    user = await session.get(UserModel, user_id, options=[selectinload(UserModel.analytics)])
                    if not user:
                        logger.error(f"User with id {user_id} not found. Cannot update location.")
                        return {
                            "success": False,
                            "message": f"User with id {user_id} not found"
                        }

                    if user.shop_id != shop_id:
                        logger.error(f"CRITICAL: User {user_id} (shop_id: {user.shop_id}) does not belong to the shop_id {shop_id}. Aborting location update.")
                        return {
                            "success": False,
                            "message": "User does not belong to this shop"
                        }

                    return update_user_location_if_missing(user, country, region, city, ip_address)
        except SQLAlchemyError as e:
            logger.error(f"Database error while updating user location for user_id {user_id}: {e}", exc_info=True)
            return {
                "success": False,
                "message": "Database error"
            }
        except Exception as e:
            logger.error(f"Unexpected error while updating user location for user_id {user_id}: {e}", exc_info=True)
            return {
                "success": False,
                "message": "Unexpected error occurred"
            }

    async def get_or_create_user_for_token(self, email: str, shop_id: str, utm_params: Optional[UTMParameters] = None) -> Optional[Dict[str, any]]:
        """
        Handles user initiation: gets/creates a user, ensures an analytics record exists,
        and returns primary keys required for creating a JWT token.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id, session)
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

                    return await self._increment_analytics_counts(
                        session, shop_id, user_id, guest_id, chat_interactions_count=1
                    )
                except SQLAlchemyError as e:
                    logger.error(f"DB error in update_user_chat_analytics for user:{user_id}/guest:{guest_id}, shop:{shop_id}: {e}", exc_info=True)
                    return False
                
    async def increment_opened_chatbot_count(self, identifier: str, shop_id: str, utm_params: Optional[UTMParameters] = None, is_guest: bool = False) -> bool:
        """
        Increments the chatbot open count. Handles both anonymous and identified users.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                shop_pk = await self.get_shop_pk(shop_id, session)
                if not shop_pk: return False

                user_pk, guest_id_val = None, None
                if is_guest:
                    guest_id_val = identifier
                else:
                    user = await self.user_handler.get_user_by_email_and_shop_id(email=identifier, shop_id=shop_pk)
                    if user: user_pk = user.id
                    else: guest_id_val = identifier

                await self._increment_analytics_counts(session, shop_pk, user_pk, guest_id_val, utm_params, opened_chatbot_count=1)
                return True

    async def increment_added_to_cart_count(self, shop_id: int, user_id: Optional[int] = None, guest_id: Optional[str] = None) -> bool:
        """Increments the count of how many times a user has added a product to the cart."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await self._increment_analytics_counts(session, shop_id, user_id, guest_id, added_to_cart_count=1)
                return True

    async def increment_purchased_count(self, shop_id: int, amount: float, user_id: Optional[int] = None, guest_id: Optional[str] = None) -> bool:
        """Increments the purchase count and adds the purchase amount for a user."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await self._increment_analytics_counts(session, shop_id, user_id, guest_id, purchased_count=1, purchase_amount=amount)
                return True            

    async def increment_purchased_count_by_email(self, email: str, shop_id: str, amount: float, order_id: str) -> bool:
        """
        Finds a user by email and shop identifier (or creates them if they don't exist)
        and increments their purchase analytics for today. This is designed to be called 
        from a webhook where we may not have our internal user_id.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.get_shop_pk(shop_id, session)
                    if not shop_pk: return False
                    
                    user, _ = await self.user_handler.get_or_create_user(email, shop_pk)
                    if not user: return False

                    success = await self._increment_analytics_counts(
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

    async def get_shop_analytics_summary(self, shop_id: str, start_date: Optional[Date], end_date: Optional[Date]) -> Optional[Dict[str, any]]:
        """
        Fetches aggregated analytics and daily chatbot open data for a given shop.
        """
        async with AsyncSessionLocal() as session:
            try:
                if start_date and isinstance(start_date, datetime):
                    start_date = start_date.date()
                if end_date and isinstance(end_date, datetime):
                    end_date = end_date.date()

                shop_pk = await self.get_shop_pk(shop_id, session)
                if not shop_pk:
                    logger.warning(f"Shop not found for shop_id: {shop_id}")
                    return {
                        "summary": {}, "timeseries": {"granularity": "daily", "data": []}, "error": "Shop not found."
                    }
                
                is_single_day = start_date and end_date and (start_date == end_date)

                # Determine which data source and time range to use based on the date range.
                if is_single_day:
                    # For a single day, use the live minutely data for maximum accuracy.
                    summary_model = UserShopMinutelyAnalyticsModel
                    date_column = UserShopMinutelyAnalyticsModel.minute_timestamp
                    start_ts = int(datetime.combine(start_date, time.min, tzinfo=timezone.utc).timestamp())
                    end_ts = int(datetime.combine(start_date, time.max, tzinfo=timezone.utc).timestamp())
                else:
                    # For multi-day ranges, use the pre-aggregated daily data for performance.
                    summary_model = UserShopAnalyticsModel
                    date_column = UserShopAnalyticsModel.date
                    start_ts = int(datetime.combine(start_date, time.min, tzinfo=timezone.utc).timestamp()) if start_date else None
                    end_ts = int(datetime.combine(end_date, time.max, tzinfo=timezone.utc).timestamp()) if end_date else None

                summary_query = select(
                    func.count(func.distinct(summary_model.user_id)).label('total_users'),
                    func.sum(summary_model.chat_interactions_count).label('total_chat_interactions'),
                    func.sum(summary_model.opened_chatbot_count).label('total_opened_chatbot'),
                    func.sum(summary_model.added_to_cart_count).label('total_added_to_cart'),
                    func.sum(summary_model.purchased_count).label('total_purchased'),
                    func.sum(summary_model.purchase_amount).label('total_purchase_amount')
                ).where(summary_model.shop_id == shop_pk)

                if start_ts: summary_query = summary_query.where(date_column >= start_ts)
                if end_ts: summary_query = summary_query.where(date_column <= end_ts)

                summary_result = await session.execute(summary_query)
                summary = summary_result.first()

                summary_data = {
                    "total_users": getattr(summary, 'total_users', 0) or 0,
                    "total_chat_interactions": getattr(summary, 'total_chat_interactions', 0) or 0,
                    "total_opened_chatbot": getattr(summary, 'total_opened_chatbot', 0) or 0,
                    "total_added_to_cart": getattr(summary, 'total_added_to_cart', 0) or 0,
                    "total_purchased": getattr(summary, 'total_purchased', 0) or 0,
                    "total_purchase_amount": getattr(summary, 'total_purchase_amount', 0.0) or 0.0,
                }

                timeseries_data = {}

                if not is_single_day:
                    # Multi-day view always returns daily granularity
                    daily_query = select(
                        UserShopAnalyticsModel.date.label("timestamp"),
                        func.sum(UserShopAnalyticsModel.opened_chatbot_count).label('count')
                    ).where(UserShopAnalyticsModel.shop_id == shop_pk)

                    if start_ts: daily_query = daily_query.where(UserShopAnalyticsModel.date >= start_ts)
                    if end_ts: daily_query = daily_query.where(UserShopAnalyticsModel.date <= end_ts)

                    daily_query = daily_query.group_by(UserShopAnalyticsModel.date).order_by(UserShopAnalyticsModel.date)
                    result = await session.execute(daily_query)
                    timeseries_data = {"granularity": "daily", "data": [{"timestamp": r.timestamp, "count": r.count or 0} for r in result]}
                else:
                    # Single-day view can be hourly or minutely
                    day_start_ts = start_ts
                    day_end_ts = end_ts

                    min_max_query = select(
                        func.min(UserShopMinutelyAnalyticsModel.minute_timestamp).label("first_ts"),
                        func.max(UserShopMinutelyAnalyticsModel.minute_timestamp).label("last_ts"),
                        func.count(UserShopMinutelyAnalyticsModel.minute_timestamp).label("data_points_count")
                    ).where(
                        UserShopMinutelyAnalyticsModel.shop_id == shop_pk,
                        UserShopMinutelyAnalyticsModel.minute_timestamp.between(day_start_ts, day_end_ts)
                    )
                    min_max_result = (await session.execute(min_max_query)).first()

                    first_ts = getattr(min_max_result, 'first_ts', None)

                    if first_ts is None:
                        # No data for the day, return empty minutely data
                        timeseries_data = {"granularity": "minutely", "data": []}
                    else:
                        last_ts = getattr(min_max_result, 'last_ts', first_ts) # Default to first_ts if max is None
                        data_points_count = getattr(min_max_result, 'data_points_count', 0)
                        span_seconds = last_ts - first_ts

                        safe_span_seconds = min(span_seconds, SECONDS_IN_A_DAY)
                    
                        use_hourly_granularity = (
                            safe_span_seconds > (HOURLY_GRANULARITY_THRESHOLD_HOURS * 3600) and
                            data_points_count >= MIN_DATAPOINTS_FOR_HOURLY_GRANULARITY
                        )

                        if use_hourly_granularity:
                            # Fetch and aggregate data by the hour
                            hourly_query = select(
                                # Floor the timestamp to the start of the hour
                                (UserShopMinutelyAnalyticsModel.minute_timestamp - (UserShopMinutelyAnalyticsModel.minute_timestamp % 3600)).label("timestamp"),
                                func.sum(UserShopMinutelyAnalyticsModel.opened_chatbot_count).label('count')
                            ).where(
                                UserShopMinutelyAnalyticsModel.shop_id == shop_pk,
                                UserShopMinutelyAnalyticsModel.minute_timestamp.between(day_start_ts, day_end_ts)
                            ).group_by("timestamp").order_by("timestamp") # Group by the calculated hour timestamp

                            result = await session.execute(hourly_query)
                            timeseries_data = {"granularity": "hourly", "data": [{"timestamp": r.timestamp, "count": r.count or 0} for r in result]}
                        else:
                            # Fetch minutely data
                            minutely_query = select(
                                UserShopMinutelyAnalyticsModel.minute_timestamp.label("timestamp"),
                                func.sum(UserShopMinutelyAnalyticsModel.opened_chatbot_count).label('count')
                            ).where(
                                UserShopMinutelyAnalyticsModel.shop_id == shop_pk,
                                UserShopMinutelyAnalyticsModel.minute_timestamp.between(day_start_ts, day_end_ts)
                            ).group_by(UserShopMinutelyAnalyticsModel.minute_timestamp).order_by(UserShopMinutelyAnalyticsModel.minute_timestamp)

                            result = await session.execute(minutely_query)
                            timeseries_data = {"granularity": "minutely", "data": [{"timestamp": r.timestamp, "count": r.count or 0} for r in result]}
         
                return {
                    "summary": summary_data,
                    "timeseries": timeseries_data
                }
            except Exception as e:
                logger.error(f"DB error in get_shop_analytics_summary for shop {shop_id}: {e}", exc_info=True)
                return {
                    "summary": {},
                    "timeseries": {"granularity": "daily", "data": []},
                    "error": "An internal error occurred while fetching analytics."
                }