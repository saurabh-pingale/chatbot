from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, update

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.shop_admin import ShopModel
from app.models.db.subscription import SubscriptionModel, SubscriptionStatus
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

    async def get_active_or_trialing_subscription(self, shop_id: int):
        """Checks for an existing subscription that is either active or trialing."""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(SubscriptionModel).where(
                        SubscriptionModel.shop_id == shop_id,
                        SubscriptionModel.status.in_([
                            SubscriptionStatus.ACTIVE,
                            SubscriptionStatus.TRIALING
                        ])
                    )
                )
                return result.scalars().first()
            except SQLAlchemyError as e:
                logger.error(f"Error getting active/trialing subscription for shop_id {shop_id}: {e}", exc_info=True)
                raise
        
    async def get_expired_trials(self):
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(SubscriptionModel).where(
                        SubscriptionModel.status == SubscriptionStatus.TRIALING,
                        SubscriptionModel.end_date < datetime.utcnow()
                    )
                )
                return result.scalars().all()
            except SQLAlchemyError as e:
                logger.error(f"Error getting expired trials: {e}", exc_info=True)
                raise
        
    async def update_shop_plan(self, shop_id: int, plan: str):
        """Updates the plan field directly on the ShopModel."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                stmt = (
                    update(ShopModel)
                    .where(ShopModel.id == shop_id)
                    .values(plan=plan)
                )
                await session.execute(stmt)
                await session.commit()