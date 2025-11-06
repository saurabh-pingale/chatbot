from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.utils.jwt_utils import create_access_token
from app.models.api.shop_admin import LocationInfo

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()
        self.shop_config_handler = ShopConfigHandler()

    async def process_user_initiation(self, email: str, shop_identifier: str) -> Optional[str]:
        """Processes user initiation and returns a JWT token."""
        token_data = await (self.shop_config_handler.get_or_create_user_for_token(email, shop_identifier))
        return create_access_token(token_data)

    async def record_chat_interaction(
        self, 
        shop_pk: int, 
        user_id: uuid.UUID,
    ) -> bool:
        """Records a single chat interaction."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                return await self.db_handler._increment_analytics_counts(
                    session, shop_pk=shop_pk, user_id=user_id, chat_interactions_count=1
                )

    async def track_opened_chatbot(
        self,
        user_id: uuid.UUID,
        shop_pk: int,
        location_info: Optional[LocationInfo] = None
    ) -> bool:
        """Tracks when a user opens the chatbot. Handles both guest and authenticated users."""
        return await self.db_handler.increment_opened_chatbot_count(
            user_id, shop_pk, location_info
        )

    async def track_added_to_cart(self, user_id: uuid.UUID, shop_pk: int) -> bool:
        """Tracks when a user adds a product to the cart."""
        return await self.db_handler.increment_added_to_cart_count(user_id=user_id, shop_pk=shop_pk)

    async def fetch_shop_analytics_summary(self, shop_pk: int, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches the analytics summary for a shop, optionally filtered by a date range.
        Converts datetime to date before passing to the handler.
        """
        start_date_only = start_date.date() if start_date else None
        end_date_only = end_date.date() if end_date else None

        summary_data = await self.db_handler.get_shop_analytics_summary(shop_pk, start_date_only, end_date_only)
            
        return summary_data