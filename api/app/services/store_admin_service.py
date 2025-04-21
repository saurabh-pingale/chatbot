from typing import Optional

from app.dbhandlers.store_admin_handler import StoreAdminHandler

class StoreAdminService:
    def __init__(self):
        self.db_handler = StoreAdminHandler()

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetch color preference from DB via handler."""
        return await self.db_handler.get_color_preference(shop_id)

    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Save the color preference to the DB via handler."""
        await self.db_handler.save_color_preference(shop_id, color)

    async def save_support_info(self, shop_id: str, email: str, phone: str):
        """Save support info to the DB via handler."""
        await self.db_handler.save_support_info(shop_id, email, phone)

    async def save_store_image(self, shop_id: str, image_url: str):
        """Save image URL to the DB via handler."""
        await self.db_handler.save_store_image(shop_id, image_url)

    async def get_image(self, shop_id: str) -> Optional[str]:
        """Fetch image from DB via handler."""
        return await self.db_handler.get_image(shop_id)