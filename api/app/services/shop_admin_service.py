from typing import Optional, List

from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.subscription_handler import SubscriptionHandler
from app.models.db.shop_admin import ShopModel

class ShopAdminService:
    def __init__(self):
        self.db_handler = ShopAdminHandler()
        self.subscription_handler = SubscriptionHandler()

    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Save the color preference to the DB via handler."""
        await self.db_handler.save_color_preference(shop_id, color)

    async def save_support_info(self, shop_id: str, email: str, phone: str, country_code: str):
        """Save support info to the DB via handler."""
        await self.db_handler.save_support_info(shop_id, email, phone, country_code)

    async def save_shop_image(self, shop_id: str, image_url: str):
        """Save image URL to the DB via handler."""
        await self.db_handler.save_shop_image(shop_id, image_url)

    async def get_shop_status_with_subscription(self, shop_id: str) -> (Optional[ShopModel], Optional[any]):
        """Fetch shop and its subscription status."""
        shop_model = await self.db_handler.get_shop_status(shop_id)
        if not shop_model:
            return None, None
        
        subscription = await self.subscription_handler.get_subscription_by_shop_id(shop_model.id)
        return shop_model, subscription

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetch shop by ID from DB via handler to check its status."""
        return await self.db_handler.get_shop_status(shop_id)

    async def save_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Save the email gate preference to the DB via handler."""
        await self.db_handler.save_email_gate_preference(shop_id, show_email_gate)

    async def integration(self, shop_id: str, title: str, description: str) -> None:
        """Save integration details to the DB via handler."""
        await self.db_handler.integration_handler(shop_id, title, description)

    async def mark_setup_as_completed(self, shop_id: int):
        """Mark the shop's setup as completed."""
        await self.db_handler.update_setup_completed_status(shop_id, True)

    async def save_quick_replies(self, shop_id: str, quick_replies: List[str]) -> None:
        """Save quick replies to the DB via handler."""
        await self.db_handler.save_quick_replies(shop_id, quick_replies)

    async def get_quick_replies(self, shop_id: str) -> Optional[List[str]]:
        """Get quick replies from the DB via handler."""
        return await self.db_handler.get_quick_replies(shop_id)