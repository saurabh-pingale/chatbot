from sqlalchemy.orm import Session
from app.models.db.subscription import SubscriptionModel, SubscriptionStatus
from app.models.db.shop_admin import ShopModel
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class SubscriptionHandler:
    async def create_subscription(self, shop_id: int, plan: str, stripe_subscription_id: str, stripe_customer_id: str, status: SubscriptionStatus, start_date: datetime, end_date: datetime):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    db_subscription = SubscriptionModel(
                        shop_id=shop_id,
                        plan=plan,
                        stripe_subscription_id=stripe_subscription_id,
                        stripe_customer_id=stripe_customer_id,
                        status=status,
                        start_date=start_date,
                        end_date=end_date
                    )
                    session.add(db_subscription)
                    await session.commit()
                except SQLAlchemyError as e:
                    logger.error(f"Error creating subscription: {e}", exc_info=True)
                    await session.rollback()
                    raise

    async def update_subscription_status(self, stripe_subscription_id: str, status: SubscriptionStatus, end_date: datetime = None):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(SubscriptionModel).filter(SubscriptionModel.stripe_subscription_id == stripe_subscription_id)
                    )
                    db_subscription = result.scalars().first()
                    if db_subscription:
                        db_subscription.status = status
                        if end_date:
                            db_subscription.end_date = end_date
                        await session.commit()
                except SQLAlchemyError as e:
                    logger.error(f"Error updating subscription status: {e}", exc_info=True)
                    await session.rollback()
                    raise

    async def get_subscription_by_shop_id(self, shop_id: int):
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(SubscriptionModel)
                    .filter(SubscriptionModel.shop_id == shop_id)
                    .order_by(SubscriptionModel.created_at.desc())
                )
                return result.scalars().first()
            except SQLAlchemyError as e:
                logger.error(f"Error getting subscription by shop id: {e}", exc_info=True)
                raise

    async def get_shop_by_shop_id(self, shop_domain: str):
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(ShopModel).filter(ShopModel.shop_id == shop_domain)
                )
                return result.scalars().first()
            except SQLAlchemyError as e:
                logger.error(f"Error getting shop by shop id: {e}", exc_info=True)
                raise 