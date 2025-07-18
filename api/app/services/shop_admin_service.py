from typing import Optional

from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.subscription_handler import SubscriptionHandler
from app.models.db.shop_admin import ShopModel

class ShopAdminService:
    def __init__(self):
        self.db_handler = ShopAdminHandler()
        self.subscription_handler = SubscriptionHandler()

    async def create_color_preference(self, shop_id: str, color: str) -> None:
        """Create the color preference to the DB via handler."""
        await self.db_handler.create_color_preference(shop_id, color)

    async def create_support_info(self, shop_id: str, email: str, phone: str, country_code: str):
        """Create support info to the DB via handler."""
        await self.db_handler.create_support_info(shop_id, email, phone, country_code)

    async def create_shop_image(self, shop_id: str, image_url: str):
        """Create image URL to the DB via handler."""
        await self.db_handler.create_shop_image(shop_id, image_url)

    async def get_shop_status_with_subscription(self, shop_id: str) -> (Optional[ShopModel], Optional[any]):
        """Fetch shop and its subscription status."""
        shop_model = await self.db_handler.get_shop_status(shop_id)
        
        subscription = await self.subscription_handler.get_subscription_by_shop_id(shop_model.id)
        return shop_model, subscription

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetch shop by ID from DB via handler to check its status."""
        return await self.db_handler.get_shop_status(shop_id)

    async def create_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Create the email gate preference to the DB via handler."""
        await self.db_handler.create_email_gate_preference(shop_id, show_email_gate)

    async def create_integration(self, shop_id: str, title: str, description: str) -> None:
        """Create integration details to the DB via handler."""
        await self.db_handler.create_integration(shop_id, title, description)

    async def update_shop_setup_completed_status(self, shop_id: int):
        """Mark the shop's setup as completed."""
        await self.db_handler.update_shop_setup_completed_status(shop_id, True)