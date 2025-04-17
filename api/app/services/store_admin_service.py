from typing import Optional

from app.dbhandlers.store_admin_handler import StoreAdminHandler

class StoreAdminService:
    def __init__(self):
        self.db_handler = StoreAdminHandler()

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetch color preference from DB via handler."""
        return await self.db_handler.get_color_preference(shop_id)