from app.utils.logger import logger

async def record_chat_analytics(app, user_id, shop_id, guest_id, location_info):
    """Records chat analytics using analytics_service."""
    try:
        country, region, city, ip = (None, None, None, None)
        if location_info:
            country = location_info.country
            region = location_info.region
            city = location_info.city
            ip = location_info.ip

        success = await app.analytics_service.record_chat_interaction(
            user_id=user_id,
            shop_id=shop_id,
            guest_id=guest_id,
            country=country,
            region=region,
            city=city,
            ip_address=ip,
        )
        if not success:
            logger.warning(f"Failed to record chat analytics for user_id: {user_id}, guest_id: {guest_id}, shop_id: {shop_id}")
    except Exception as e:
        logger.warning(f"Error recording analytics: {str(e)}")