from app.utils.analytics_utils import validate_string
from app.utils.logger import logger

async def record_chat_analytics(app, user_id, shop_id, guest_id, location_info):
    """Records chat analytics using analytics_service."""
    try:
        validated_location_info = validate_string(location_info)

        success = await app.analytics_service.record_chat_interaction(
            user_id=user_id,
            shop_id=shop_id,
            guest_id=guest_id,
            location_info=validated_location_info
        )
        if not success:
            logger.warning(f"Failed to record chat analytics for user_id: {user_id}, guest_id: {guest_id}, shop_id: {shop_id}")
    except Exception as e:
        logger.warning(f"Error recording analytics: {str(e)}")