import uuid
from app.dbhandlers.checkout_product_handler import CheckoutProductHandler

class CheckoutProductService:
    def __init__(self):
        self.db_handler = CheckoutProductHandler()

    async def store_checkout_product(self, shop_id: str, user_id: uuid.UUID, variant_id: int, product_count: int):
        """Store checkout product data via handler."""
        return await self.db_handler.store_checkout_product(
            shop_id, user_id, variant_id, product_count
        )

    async def remove_checkout_product(self, shop_id: str, user_id: uuid.UUID, variant_id: int):
        """Remove checkout product via handler."""
        return await self.db_handler.remove_checkout_product(
            shop_id, user_id, variant_id
        )
    
    async def get_latest_inventory(self, shop_id: str, shop_pk: int, variant_id: int, session) -> int:
        """Get latest inventory."""
        return await self.db_handler.get_latest_inventory(shop_id, shop_pk, variant_id, session)