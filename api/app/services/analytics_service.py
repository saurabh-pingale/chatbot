from typing import Dict, Any
from app.dbhandlers.analytics_handler import AnalyticsHandler

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()

    async def store_analytics(self, analytics_data: Dict) -> bool:
        """Process and store session analytics data."""
        return await self.db_handler.store_analytics_data(analytics_data)
    
    async def get_aggregated_analytics(self, shop_id: str) -> Dict[str, Any]:
        """Fetches and returns aggregated analytics data for a shop."""
        return await self.db_handler.fetch_aggregated_analytics(shop_id)