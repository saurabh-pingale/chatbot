from app.dbhandlers.subscription_handler import SubscriptionHandler
from app.models.db.subscription import SubscriptionStatus
from app.utils.logger import logger

async def expire_free_trials():
    """
    Finds and deactivates expired free trials.
    This should be run as a scheduled job every day.
    """
    logger.info("Running job: expire_free_trials")
    handler = SubscriptionHandler()
    
    expired_trials = await handler.get_expired_trials()
    
    for trial in expired_trials:
        logger.info(f"Expiring trial for shop_id: {trial.shop_id}")
        await handler.update_subscription_status(
            stripe_subscription_id=trial.stripe_subscription_id,
            status=SubscriptionStatus.CANCELED,
            end_date=trial.end_date 
        )
    logger.info(f"Completed job: expired_free_trials. Expired {len(expired_trials)} trials.")