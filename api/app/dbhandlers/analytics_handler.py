from sqlalchemy import select, func, Date
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime
from typing import Optional, Tuple, Dict

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.shop_admin import UserModel, ShopModel, UserShopAnalyticsModel
from app.models.api.shop_admin import UTMParameters
from app.utils.analytics_utils import update_user_location_if_missing
from app.utils.logger import logger

class AnalyticsHandler:
    def __init__(self):
        pass

    #TODO - Seperate the guest functinality as a seperate function
    #TODO - Remove guest functionality in it, if possible create seperate handler for guest analytics handler and call those guest directly there
    #TODO - Also seperate the create analytics & get analytics and link those functin references to this main function
    #TODO - For guest don't link to this main function, call them directly from their respective handler
    async def _get_or_create_today_analytics_record(self, session, shop_id: int, user_id: Optional[int] = None, guest_id: Optional[str] = None, utm_params: Optional[UTMParameters] = None) -> Optional[UserShopAnalyticsModel]:
        """
        Atomically retrieves or creates an analytics record for the current day.
        It first attempts to insert a new record. If a record for the user/guest and date
        already exists (violating a unique constraint), it does nothing.
        It then reliably fetches and returns the record for the current day.
        """
        today = datetime.now().date()
    
        insert_values = {"shop_id": shop_id, "date": today}
        if user_id:
            insert_values["user_id"] = user_id
        elif guest_id:
            insert_values["guest_id"] = guest_id
        else:
            logger.error("Both user_id and guest_id are None. Cannot create analytics record.")
            return None

        # Add UTM parameters for new records
        if utm_params:
            insert_values.update({
                "utm_source": utm_params.utm_source or 'direct',
                "utm_medium": utm_params.utm_medium,
                "utm_campaign": utm_params.utm_campaign,
                "utm_term": utm_params.utm_term,
                "utm_content": utm_params.utm_content
            })
        else:
            insert_values["utm_source"] = 'direct'
        
        # Prepare the insert statement with ON CONFLICT DO NOTHING
        stmt = pg_insert(UserShopAnalyticsModel).values(insert_values)
        
        if user_id:
            conflict_target = ['user_id', 'shop_id', 'date']
            index_where = UserShopAnalyticsModel.user_id.isnot(None)
        else: # guest_id
            conflict_target = ['guest_id', 'shop_id', 'date']
            index_where = UserShopAnalyticsModel.guest_id.isnot(None)

        stmt = stmt.on_conflict_do_nothing(
            index_elements=conflict_target,
            index_where=index_where
        )
        await session.execute(stmt)

        # Now, reliably select the record
        select_stmt = select(UserShopAnalyticsModel).where(
            UserShopAnalyticsModel.shop_id == shop_id,
            UserShopAnalyticsModel.date == today
        )
        if user_id:
            select_stmt = select_stmt.where(UserShopAnalyticsModel.user_id == user_id)
        else: # guest_id must exist if user_id does not, based on check above
            select_stmt = select_stmt.where(UserShopAnalyticsModel.guest_id == guest_id)
            
        result = await session.execute(select_stmt)
        return result.scalar_one_or_none()

    #TODO - What is this new term called "shop_identifier" ? make it shop_id if its ID of shop
    #TODO - We are not getting any token data, rather we are getting user data, then don't use this handler, use user handler to get it
    async def process_user_and_get_token_data(self, email: str, shop_identifier: str, utm_params: Optional[UTMParameters] = None) -> Optional[Dict[str, any]]:
        """
        Processes user initiation, creates/retrieves user with analytics record, and returns data for JWT token.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk_result = await session.execute(
                        select(ShopModel.id).where(ShopModel.shop_id == shop_identifier)
                    )
                    shop_pk = shop_pk_result.scalar_one_or_none()

                    if not shop_pk:
                        logger.error(f"Session initiation for non-existent shop: {shop_identifier}")
                        return None
                    
                    user = await self._get_or_create_user(session, email, shop_pk, utm_params)
                    if not user:
                        logger.error(f"Failed to get/create user for email {email}, shop {shop_identifier}")
                        return None

                    return {"user_id": user.id, "shop_id": shop_pk}

                except SQLAlchemyError as e:
                    logger.error(f"DB error during user processing for {email}, {shop_identifier}: {e}", exc_info=True)
                    await session.rollback()
                    return None
    
    #TODO - As you studied in clean code book, if something function is doing extra then function name also changing it
    #TODO - Calling this function from top and calling another function inside, its not scalable
    #TODO - mainly _get_or_create_user you need to get from user handler, so get from there and link inside the _get_or_create_today_analytics_record it, 
    #TODO - Please remove below _get_or_create_user function
    #TODO - Don't unncessary create seperate function handlers
    async def _get_or_create_user(self, session, email: str, shop_id: int, utm_params: Optional[UTMParameters] = None) -> Optional[UserModel]:
        """
        Helper to retrieve or create a user record. Also ensures an analytics record is created.
        """
        stmt = select(UserModel).where(UserModel.email == email, UserModel.shop_id == shop_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            logger.info(f"Creating new user for email {email} in shop {shop_id}.")
            user = UserModel(email=email, shop_id=shop_id)
            session.add(user)
            await session.flush()
        
        await self._get_or_create_today_analytics_record(session, shop_id=shop_id, user_id=user.id, utm_params=utm_params)

        return user
    
    #TODO: What do you mean by process ?, Are we doing ML or AI process ?
    #TODO: Handlers should be CREATE, GET, UPDATE, DELETE 
    #TODO: I see _get_or_create_user and process_user_initiation_db looks same, why ?
    async def process_user_initiation_db(
        self, 
        email: str, 
        shop_identifier: str
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        Handles the DB operations for user initiation within a single transaction.
        1. Fetches shop PK.
        2. Gets or creates user and their initial analytics entry.
        Returns (user_id_pk, shop_id_pk) if successful, otherwise (None, None).
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_id_pk = await self.get_shop_pk_by_identifier(shop_identifier)
                    if not shop_id_pk:
                        logger.warning(f"Shop PK not found for identifier: {shop_identifier} in process_user_initiation_db.")
                        return None, None

                    user_id, _ = await self.get_or_create_user_and_analytics(email, shop_id_pk)

                    if user_id is None:
                        logger.error(f"Failed to get or create user in process_user_initiation_db for email: {email}")
                        return None, None 
                    
                    return user_id, shop_id_pk
                
                except SQLAlchemyError as db_err:
                    logger.error(f"Database error during user initiation for email {email}, shop {shop_identifier}: {db_err}", exc_info=True)
                    return None, None
                except Exception as e:
                    logger.error(f"General error during user initiation for email {email}, shop {shop_identifier}: {e}", exc_info=True)
                    return None, None

    #TODO: Don't introduce new terms like shop_identifier etc
    #TODO: Does all these 3 function handlers get_shop_by_shop_id & get_shop_by_domain & get_shop_pk_by_identifier does same thing ?
    async def get_shop_pk_by_identifier(self, shop_identifier: str) -> Optional[int]:
        """Fetches the integer primary key of a shop by its string identifier."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    stmt = select(ShopModel.id).where(ShopModel.shop_id == shop_identifier)
                    result = await session.execute(stmt)
                    shop_pk = result.scalar_one_or_none()
                    if not shop_pk:
                        return None
                    return shop_pk
                except SQLAlchemyError as e:
                    logger.error(f"DB error fetching shop PK for {shop_identifier}: {e}", exc_info=True)
                    return None

    #TODO: What is the difference between _get_or_create_today_analytics_record & get_or_create_user_and_analytics
    #TODO: Don't CREATE seperate function for create user & analytics, we already creating user in "create_user" in USER_HANDLER.PY, so please create a small function to increment new user and link to their
    #TODO: Why are we doing so many db calls ?
    async def get_or_create_user_and_analytics(
        self, 
        email: str, 
        shop_id_pk: int
    ) -> Tuple[Optional[int], bool]: 
        """
        Gets an existing user or creates a new one, with initial analytics record.
        Manages its own session and transaction.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    #TODO: You are getting the user details, please get from user handler, don't create new, use existing one
                    user_query = select(UserModel).where(
                        UserModel.email == email,
                        UserModel.shop_id == shop_id_pk
                    )
                    user_result = await session.execute(user_query)
                    user = user_result.scalar_one_or_none()
                    
                    user_id_to_return: Optional[int] = None
                    is_new_user_flag = False

                    if user:
                        logger.info(f"DB: Existing user {email}, shop_pk {shop_id_pk}")
                        user.updated_at = datetime.now()
                        user_id_to_return = user.id
                    else:
                        logger.info(f"DB: New user {email}, shop_pk {shop_id_pk}. Creating.")
                        new_user = UserModel(
                            email=email,
                            shop_id=shop_id_pk, 
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        session.add(new_user)
                        await session.flush() 
                        user_id_to_return = new_user.id
                        is_new_user_flag = True

                        new_analytics_record = UserShopAnalyticsModel(
                            user_id=user_id_to_return,
                            shop_id=shop_id_pk,
                            chat_interactions_count=0,
                            date=datetime.now().date()
                        )
                        session.add(new_analytics_record)
                        logger.info(f"DB: Created analytics for new user_id: {user_id_to_return}")
                    
                    return user_id_to_return, is_new_user_flag

                except SQLAlchemyError as db_err:
                    logger.error(f"DB error in get_or_create_user for {email}, shop_pk {shop_id_pk}: {db_err}", exc_info=True)
                    return None, False
                except Exception as e:
                    logger.error(f"General error in get_or_create_user for {email}, shop_pk {shop_id_pk}: {e}", exc_info=True)
                    return None, False

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
                    is_guest = guest_id is not None
                    
                    if not is_guest and user_id:
                        user_stmt = (
                            select(UserModel)
                            .options(selectinload(UserModel.analytics))
                            .where(UserModel.id == user_id)
                        )
                        result = await session.execute(user_stmt)
                        user = result.scalar_one_or_none()

                        if not user:
                            logger.error(f"User with id {user_id} not found. Cannot update analytics.")
                            return False
                        
                        if user.shop_id != shop_id:
                            logger.error(f"CRITICAL: User {user_id} (shop_id: {user.shop_id}) does not belong to the shop_id {shop_id} from JWT/context. Aborting analytics location update on UserModel.")
                        else:
                            updated_location = update_user_location_if_missing(user, country, region, city, ip_address)
                            if updated_location:
                                logger.info(f"Updating location on UserModel for user_id: {user_id}")
                    
                    analytics_record = await self._get_or_create_today_analytics_record(
                        session, 
                        shop_id=shop_id, 
                        user_id=user_id, 
                        guest_id=guest_id
                    )

                    if analytics_record:
                        analytics_record.chat_interactions_count += 1
                        logger.info(f"Incremented chat_interactions_count for {'guest_id' if is_guest else 'user_id'}: {guest_id if is_guest else user_id}, shop_id: {shop_id} for date {analytics_record.date}")
                    else:
                         logger.info(f"Chat interaction recorded for {'guest_id' if is_guest else 'user_id'}: {guest_id if is_guest else user_id}, shop_id: {shop_id}")

                    return True

                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error(f"DB error in update_user_chat_analytics for user_id {user_id}, shop_id {shop_id}: {error}", exc_info=True)
                    return False
                except Exception as e:
                    await session.rollback()
                    logger.error(f"General error in update_user_chat_analytics for user_id {user_id}, shop_id {shop_id}: {e}", exc_info=True)
                    return False

    async def increment_opened_chatbot_count(self, user_identifier: str, shop_domain: str, utm_params: Optional[UTMParameters] = None, is_guest: bool = False) -> bool:
        """
        Increments the chatbot open count. Handles both anonymous and identified users.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk_result = await session.execute(select(ShopModel.id).where(ShopModel.shop_id == shop_domain))
                    shop_pk = shop_pk_result.scalar_one_or_none()

                    if not shop_pk:
                        return False

                    user_pk = None
                    guest_id = None

                    if is_guest:
                        guest_id = user_identifier
                    else:
                        user_pk_result = await session.execute(select(UserModel.id).where(UserModel.email == user_identifier, UserModel.shop_id == shop_pk))
                        user_pk = user_pk_result.scalar_one_or_none()

                    analytics_record = await self._get_or_create_today_analytics_record(
                        session, 
                        shop_id=shop_pk, 
                        user_id=user_pk,
                        guest_id=guest_id,
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
                    analytics_record = await self._get_or_create_today_analytics_record(session, shop_id, user_id, guest_id)
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
                    analytics_record = await self._get_or_create_today_analytics_record(session, shop_id, user_id, guest_id)
                    if analytics_record:
                        analytics_record.purchased_count += 1
                        analytics_record.purchase_amount += amount
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB error incrementing purchased_count for user {user_id}/guest {guest_id}, shop {shop_id}: {e}", exc_info=True)
                    return False

    async def increment_purchased_count_by_email(self, email: str, shop_identifier: str, amount: float, order_id: str) -> bool:
        """
        Finds a user by email and shop identifier (or creates them if they don't exist)
        and increments their purchase analytics for today. This is designed to be called 
        from a webhook where we may not have our internal user_id.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_stmt = select(ShopModel).where(ShopModel.shop_id == shop_identifier)
                    shop_result = await session.execute(shop_stmt)
                    shop = shop_result.scalar_one_or_none()

                    if not shop:
                        logger.error(f"Webhook received for an unknown shop: {shop_identifier}. Cannot track purchase.")
                        return False
                    
                    user_stmt = select(UserModel).where(UserModel.email == email, UserModel.shop_id == shop.id)
                    user_result = await session.execute(user_stmt)
                    user = user_result.scalar_one_or_none()
                    
                    if not user:
                        logger.info(f"Purchase by new user via webhook. Creating user for email {email} in shop {shop.shop_id}.")
                        user = UserModel(email=email, shop_id=shop.id)
                        session.add(user)
                        await session.flush()

                    analytics_record = await self._get_or_create_today_analytics_record(session, shop_id=shop.id, user_id=user.id)

                    if not analytics_record:
                        logger.error(f"Could not get/create analytics record for user {user.id} on shop {shop.id} for purchase tracking.")
                        return False
                    
                    analytics_record.purchased_count += 1
                    analytics_record.purchase_amount = (analytics_record.purchase_amount or 0) + amount
                    
                    logger.info(f"Successfully tracked purchase for order {order_id} for user {user.id} on shop {shop.id}. New total purchases: {analytics_record.purchased_count}, New total amount: {analytics_record.purchase_amount}")
                    return True
                except SQLAlchemyError as e:
                    logger.error(f"DB Error tracking purchase by email for {email}, shop {shop_identifier}: {e}", exc_info=True)
                    return False

    async def get_shop_analytics_summary(self, shop_id: str, start_date: Optional[Date], end_date: Optional[Date]) -> Optional[Dict[str, any]]:
        """
        Fetches aggregated analytics and daily chatbot open data for a given shop.
        """
        async with AsyncSessionLocal() as session:
            try:
                shop_pk_result = await session.execute(select(ShopModel.id).where(ShopModel.shop_id == shop_id))
                shop_pk = shop_pk_result.scalar_one_or_none()

                if not shop_pk:
                    logger.warning(f"Analytics summary for non-existent shop: {shop_id}")
                    return None

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