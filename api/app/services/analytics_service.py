from typing import Dict
from app.dbhandlers.analytics_handler import AnalyticsHandler

class AnalyticsService:
    def __init__(self):
        self.db_handler = AnalyticsHandler()

    async def store_analytics(self, analytics_data: Dict) -> bool:
        """Process and store session analytics data."""
        return await self.db_handler.store_analytics_data(analytics_data)