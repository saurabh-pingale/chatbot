from sqlalchemy import select
from typing import Tuple, Optional

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.shop_admin import UserModel
from app.utils.logger import logger

class UserHandler:
    async def get_user_by_email_and_shop_id(self, email: str, shop_pk: int) -> UserModel | None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(UserModel).where(UserModel.email == email, UserModel.shop_id == shop_pk)
                    )
                    return result.scalars().first()
                except Exception as e:
                    logger.error(f"Error retrieving user by email and shop_id: {e}", exc_info=True)
                    raise

    async def create_user(self, email: str, shop_pk: int, existing_user: Optional[UserModel] = None) -> UserModel:
        async with AsyncSessionLocal() as session:
            try:
                if not existing_user:
                    existing_user = await self.get_user_by_email_and_shop_id(email, shop_pk)
                
                if existing_user:
                    raise ValueError("User already exists")

                new_user = UserModel(email=email, shop_id=shop_pk)
                session.add(new_user)
                await session.commit()
                await session.refresh(new_user)
                return new_user
            
            except Exception as e:
                logger.error(f"Error creating user: {e}", exc_info=True)
                await session.rollback()
                raise 

    async def get_or_create_user(self, email: str, shop_id: int) -> Tuple[UserModel, bool]:
        """
        Gets a user by email and shop ID, or creates them if they don't exist.
        This is the preferred method to avoid race conditions.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await self.get_user_by_email_and_shop_id(email, shop_id)
                if user:
                    return user, False

                try:
                    new_user = UserModel(email=email, shop_id=shop_id)
                    session.add(new_user)
                    await session.flush()
                    logger.info(f"Created new user for email {email} in shop_id {shop_id}.")
                    return new_user, True
                except Exception as e:
                    logger.error(f"Error in get_or_create_user: {e}", exc_info=True)
                    raise

    async def get_user_by_id_and_shop(self, user_id: int, shop_pk: int) -> Optional[UserModel]:
        """Fetch a user by id and shop_id."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(UserModel).where(UserModel.id == user_id, UserModel.shop_id == shop_pk)
                    )
                    return result.scalars().first()
                except Exception as e:
                    logger.error(f"Error fetching user by id/shop_id: {e}", exc_info=True)
                    raise

    async def create_guest_if_not_exists(self, guest_id: str, shop_pk: int) -> Tuple[UserModel, bool]:
        """Create a guest user if not exists using the guest_id from frontend."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(UserModel).where(UserModel.id == guest_id, UserModel.shop_id == shop_pk)
                    )
                    existing_user = result.scalars().first()

                    if existing_user:
                        logger.info(f"Guest already exists with id {guest_id} for shop {shop_pk}")
                        return existing_user, False

                    guest_user = UserModel(
                        id=guest_id,
                        shop_id=shop_pk,
                    )
                    session.add(guest_user)
                    await session.flush()
                    logger.info(f"Created new guest user {guest_id} for shop {shop_pk}")
                    return guest_user, True

                except Exception as e:
                    logger.error(f"Error in create_guest_if_not_exists: {e}", exc_info=True)
                    raise