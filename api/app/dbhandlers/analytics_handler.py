from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.shop_admin import UserModel, ShopModel, UserShopAnalyticsModel
from app.utils.analytics_utils import update_user_location_if_missing
from app.utils.logger import logger

class AnalyticsHandler:
    def __init__(self):
        pass

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

    async def get_shop_pk_by_identifier(self, shop_identifier: str) -> Optional[int]:
        """Fetches the integer primary key of a shop by its string identifier."""
        async with AsyncSessionLocal() as session:
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
                        user.updated_at = datetime.now(timezone.utc)
                        user_id_to_return = user.id
                    else:
                        logger.info(f"DB: New user {email}, shop_pk {shop_id_pk}. Creating.")
                        new_user = UserModel(
                            email=email,
                            shop_id=shop_id_pk, 
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        session.add(new_user)
                        await session.flush() 
                        user_id_to_return = new_user.id
                        is_new_user_flag = True

                        new_analytics_record = UserShopAnalyticsModel(
                            user_id=user_id_to_return,
                            shop_id=shop_id_pk,
                            chat_interactions_count=0 
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
        user_id: int, 
        shop_id: int, 
        country: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Updates user's location information (if not already set) and 
        increments their chat interaction count. Manages its own session/transaction.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
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
                        updated_location = update_user_location_if_missing(user, country, region, city. ip_address)
                        if updated_location:
                            logger.info(f"Updating location on UserModel for user_id: {user_id}")

                    analytics_stmt = select(UserShopAnalyticsModel).where(
                        UserShopAnalyticsModel.user_id == user_id,
                        UserShopAnalyticsModel.shop_id == shop_id 
                    )
                    analytics_res = await session.execute(analytics_stmt)
                    analytics_record = analytics_res.scalar_one_or_none()
                    
                    if analytics_record:
                        analytics_record.chat_interactions_count += 1
                        logger.info(f"Incremented chat_interactions_count for user_id: {user_id}, shop_id: {shop_id}. New: {analytics_record.chat_interactions_count}")
                    else:
                        logger.warning(f"Analytics record for user_id: {user_id}, shop_id: {shop_id} not found. Creating new one.")
                        analytics_record = UserShopAnalyticsModel(
                            user_id=user_id,
                            shop_id=shop_id, 
                            chat_interactions_count=1 
                        )
                    session.add(analytics_record)
    
                    return True

                except SQLAlchemyError as error:
                    logger.error(f"DB error in update_user_chat_analytics for user_id {user_id}, shop_id {shop_id}: {error}", exc_info=True)
                    return False
                except Exception as e:
                    logger.error(f"General error in update_user_chat_analytics for user_id {user_id}, shop_id {shop_id}: {e}", exc_info=True)
                    return False

    async def get_shop_analytics_summary_db(self, shop_id_pk: int) -> Dict[str, Any]:
        """
        Fetches total users and total chat interactions for a specific shop_id_pk.
        Manages its own session.
        """
        async with AsyncSessionLocal() as session:
            try:
                total_users_stmt = select(func.count(UserModel.id)).where(UserModel.shop_id == shop_id_pk)
                total_users_result = await session.execute(total_users_stmt)
                total_users = total_users_result.scalar_one_or_none() or 0

                total_chat_interactions_stmt = select(func.sum(UserShopAnalyticsModel.chat_interactions_count)).where(UserShopAnalyticsModel.shop_id == shop_id_pk)
                total_chat_interactions_result = await session.execute(total_chat_interactions_stmt)
                total_chat_interactions = total_chat_interactions_result.scalar_one_or_none() or 0

                return {
                    "total_users": total_users,
                    "total_chat_interactions": total_chat_interactions
                }
            except SQLAlchemyError as e:
                logger.error(f"Database error in get_shop_analytics_summary_db for shop_id_pk {shop_id_pk}: {e}", exc_info=True)
                return {
                    "total_users": 0,
                    "total_chat_interactions": 0,
                    "error": f"Database error: {str(e)}"
                }
            except Exception as e:
                logger.error(f"General error in get_shop_analytics_summary_db for shop_id_pk {shop_id_pk}: {e}", exc_info=True)
                return {
                    "total_users": 0,
                    "total_chat_interactions": 0,
                    "error": f"General error: {str(e)}"
                }