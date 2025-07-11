from sqlalchemy import select
from typing import Tuple

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.shop_admin import UserModel
from app.utils.logger import logger

class UserHandler:
    async def get_user_by_email_and_shop_id(self, email: str, shop_id: int) -> UserModel | None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(UserModel).where(UserModel.email == email, UserModel.shop_id == shop_id)
                    )
                    return result.scalars().first()
                except Exception as e:
                    logger.error(f"Error retrieving user by email and shop_id: {e}", exc_info=True)
                    raise

    async def create_user(self, email: str, shop_id: int) -> UserModel:
        async with AsyncSessionLocal() as session:
            try:
                existing_user = self.get_user_by_email_and_shop_id(email, shop_id)
                if existing_user:
                    raise ValueError("User with this email already exists for the shop")

                new_user = UserModel(email=email, shop_id=shop_id)
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