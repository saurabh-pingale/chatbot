from typing import Optional, Dict, Any
from datetime import datetime

from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.models.api.shop_admin import UTMParameters
from app.utils.jwt_utils import create_access_token
from app.utils.logger import logger

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()

    async def process_user_initiation(self, email: str, shop_identifier: str, utm_params: Optional[UTMParameters] = None) -> Optional[str]:
        """
        Processes user initiation, passing UTM parameters to the DB handler.
        """
        user_and_shop_ids = await self.db_handler.process_user_and_get_token_data(email, shop_identifier, utm_params)

        if not user_and_shop_ids:
            logger.error(f"Failed to process user initiation in DB for email: {email}, shop: {shop_identifier}.")
            return None
        
        token_data = {
            "user_id": user_and_shop_ids['user_id'],
            "shop_id": user_and_shop_ids['shop_id'], 
            "email": email
        }
        access_token = create_access_token(data=token_data)
        
        if not access_token:
            logger.error(f"Failed to create access token for user_id: {user_and_shop_ids['user_id']}")
            return None
            
        return access_token

    async def record_chat_interaction(
        self, 
        user_id: int, 
        shop_id: int, 
        country: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Records a chat interaction by calling the handler's update_user_chat_analytics method.
        The handler manages its own session and transaction for this specific operation.
        """
        return await self.db_handler.update_user_chat_analytics(
            user_id=user_id,
            shop_id=shop_id,
            country=country,
            region=region,
            city=city,
            ip_address=ip_address
        )

    async def track_opened_chatbot(self, user_identifier: str, shop_domain: str, utm_params: Optional[UTMParameters] = None) -> bool:
        """Tracks when a user opens the chatbot. Handles string identifiers and UTM."""
        return await self.db_handler.increment_opened_chatbot_count(user_identifier, shop_domain, utm_params)

    async def track_added_to_cart(self, user_id: int, shop_id: int) -> bool:
        """Tracks when a user adds a product to the cart."""
        return await self.db_handler.increment_added_to_cart_count(user_id, shop_id)

    async def track_purchase(self, user_id: int, shop_id: int, amount: float) -> bool:
        """Tracks a purchase event."""
        return await self.db_handler.increment_purchased_count(user_id, shop_id, amount)

    async def fetch_shop_analytics_summary(self, shop_identifier: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches the analytics summary for a shop, optionally filtered by a date range.
        Converts datetime to date before passing to the handler.
        """
        start_date_only = start_date.date() if start_date else None
        end_date_only = end_date.date() if end_date else None

        summary_data = await self.db_handler.get_shop_analytics_summary(shop_identifier, start_date_only, end_date_only)

        if summary_data and "error" in summary_data:
            logger.warning(f"Error fetching analytics summary for shop {shop_identifier}: {summary_data['error']}")
            return summary_data
            
        return summary_data