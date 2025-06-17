from typing import Optional
from datetime import datetime

from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.models.db.shop_admin import ShopModel

class ShopAdminService:
    def __init__(self):
        self.db_handler = ShopAdminHandler()

    async def save_color_preference(self, shop_id: str, color: str) -> None:
        """Save the color preference to the DB via handler."""
        await self.db_handler.save_color_preference(shop_id, color)

    async def save_support_info(self, shop_id: str, email: str, phone: str, country_code: str):
        """Save support info to the DB via handler."""
        await self.db_handler.save_support_info(shop_id, email, phone, country_code)

    async def save_shop_image(self, shop_id: str, image_url: str):
        """Save image URL to the DB via handler."""
        await self.db_handler.save_shop_image(shop_id, image_url)

    async def save_plan_details(
        self,
        shop_id: str,
        owner_name: str,
        owner_email: str,
        owner_location: str,
        plan: str,
        plan_start_date: datetime,
        plan_end_date: Optional[datetime],
        setup_completed: bool,
    ) -> None:
        """Save plan details to the DB via handler."""
        await self.db_handler.save_plan_details(
            shop_id=shop_id,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_location=owner_location,
            plan=plan,
            plan_start_date=plan_start_date,
            plan_end_date=plan_end_date,
            setup_completed=setup_completed,
        )

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetch shop by ID from DB via handler to check its status."""
        return await self.db_handler.get_shop_status(shop_id)

    async def save_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Save the email gate preference to the DB via handler."""
        await self.db_handler.save_email_gate_preference(shop_id, show_email_gate)

    async def save_integration(self, shop_id: str, title: str, description: str) -> None:
        """Save integration details to the DB via handler."""
        await self.db_handler.save_integration(shop_id, title, description)