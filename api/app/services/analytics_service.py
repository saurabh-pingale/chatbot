from typing import Optional, Dict, Any
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.utils.jwt_utils import create_access_token
from app.utils.logger import logger
from datetime import datetime

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()

    async def process_user_initiation(self, email: str, shop_identifier: str) -> Optional[str]:
        """
        Processes user initiation:
        1. Calls DB handler to get user_id and shop_id_pk.
        2. Generates JWT token.
        Returns the JWT token or None if an error occurs.
        """
        user_id, shop_id_pk = await self.db_handler.process_user_initiation_db(
            email,
            shop_identifier
        )

        if not user_id or not shop_id_pk:
            logger.error(f"Failed to process user initiation in DB for email: {email}, shop: {shop_identifier}. Token not created.")
            return None
        
        token_data = {
            "user_id": user_id,
            "shop_id": shop_id_pk, 
            "email": email
        }
        access_token = create_access_token(data=token_data)
        
        if not access_token:
            logger.error(f"Failed to create access token in service for user_id: {user_id}")
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

    async def track_opened_chatbot(self, user_id: int, shop_id: int) -> bool:
        """Tracks when a user opens the chatbot."""
        return await self.db_handler.increment_opened_chatbot_count(user_id, shop_id)

    async def track_added_to_cart(self, user_id: int, shop_id: int) -> bool:
        """Tracks when a user adds a product to the cart."""
        return await self.db_handler.increment_added_to_cart_count(user_id, shop_id)

    async def track_purchase(self, user_id: int, shop_id: int, amount: float) -> bool:
        """Tracks a purchase event."""
        return await self.db_handler.increment_purchased_count(user_id, shop_id, amount)

    async def fetch_shop_analytics_summary(self, shop_identifier: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches the analytics summary for a shop, optionally filtered by a date range.
        """
        shop_id_pk = await self.db_handler.get_shop_pk_by_identifier(shop_identifier)

        if not shop_id_pk:
            logger.warning(f"Could not retrieve shop_id_pk for identifier: {shop_identifier} in service.")
            return None
        
        summary_data = await self.db_handler.get_shop_analytics_summary_db(shop_id_pk, start_date, end_date)

        if "error" in summary_data:
            logger.warning(f"Error fetching analytics summary for shop_id_pk {shop_id_pk}: {summary_data['error']}")
            return summary_data 
            
        return summary_data