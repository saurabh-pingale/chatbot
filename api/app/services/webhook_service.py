import uuid

from app.dbhandlers.webhook_handler import WebhookHandler

class WebhookService:
    def __init__(self):
        self.db_handler = WebhookHandler()

    async def track_purchase_from_webhook(self, email: str, shop_identifier: str, amount: float, order_id: str) -> bool:
        """Tracks a purchase event coming from a webhook, using email to identify the user."""
        return await self.db_handler.increment_purchased_count_by_email(email, shop_identifier, amount, order_id)

    async def record_detailed_order(self, payload: dict, shop_identifier: str, user_id: uuid.UUID):
        """Stores a detailed record of a purchase from a webhook payload."""
        return await self.db_handler.store_detailed_order_from_webhook(payload, shop_identifier, user_id)