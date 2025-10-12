from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.utils.jwt_utils import create_access_token
from app.models.api.shop_admin import UTMParameters
from app.models.api.shop_admin import LocationInfo

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()

    async def process_user_initiation(self, email: str, shop_identifier: str, utm_params: Optional[UTMParameters] = None) -> Optional[str]:
        """Processes user initiation and returns a JWT token."""
        token_data = await (self.db_handler.get_or_create_user_for_token(email, shop_identifier, utm_params))
        return create_access_token(token_data)

    async def record_chat_interaction(
        self, 
        shop_id: int, 
        user_id: uuid.UUID,
    ) -> bool:
        """Records a single chat interaction."""
        return await self.db_handler.update_user_chat_analytics(shop_id=shop_id, user_id=user_id)

    async def track_opened_chatbot(
        self,
        user_id: uuid.UUID,
        shop_id_pk: int,
        utm_params: Optional[UTMParameters] = None,
        location_info: Optional[LocationInfo] = None
    ) -> bool:
        """Tracks when a user opens the chatbot. Handles both guest and authenticated users."""
        return await self.db_handler.increment_opened_chatbot_count(
            user_id, shop_id_pk, utm_params, location_info
        )

    async def track_added_to_cart(self, user_id: uuid.UUID, shop_id: int) -> bool:
        """Tracks when a user adds a product to the cart."""
        return await self.db_handler.increment_added_to_cart_count(user_id=user_id, shop_id=shop_id)

    async def track_purchase(self, user_id: uuid.UUID, shop_id: int, amount: float) -> bool:
        """Tracks a purchase event."""
        return await self.db_handler.increment_purchased_count(user_id=user_id, shop_id=shop_id, amount=amount)

    async def track_purchase_from_webhook(self, email: str, shop_identifier: str, amount: float, order_id: str) -> bool:
        """Tracks a purchase event coming from a webhook, using email to identify the user."""
        return await self.db_handler.increment_purchased_count_by_email(email, shop_identifier, amount, order_id)

    async def get_shop_pk(self, shop_domain: str, session) -> Optional[int]:
        """Convenience method to get shop PK from domain."""
        return await self.db_handler.get_shop_pk(shop_domain, session)

    async def fetch_shop_analytics_summary(self, shop_identifier: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches the analytics summary for a shop, optionally filtered by a date range.
        Converts datetime to date before passing to the handler.
        """
        start_date_only = start_date.date() if start_date else None
        end_date_only = end_date.date() if end_date else None

        summary_data = await self.db_handler.get_shop_analytics_summary(shop_identifier, start_date_only, end_date_only)
            
        return summary_data