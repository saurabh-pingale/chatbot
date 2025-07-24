from typing import Optional
from app.dbhandlers.checkout_product_handler import CheckoutProductHandler

class CheckoutProductService:
    def __init__(self):
        self.db_handler = CheckoutProductHandler()

    async def store_checkout_product(self, shop_id: str, user_id: Optional[int], guest_id: Optional[str], variant_id: int, product_count: int):
        """Store checkout product data via handler."""
        return await self.db_handler.store_checkout_product(
            shop_id, user_id, guest_id, variant_id, product_count
        )

    async def remove_checkout_product(self, shop_id: str, user_id: Optional[int], guest_id: Optional[str], variant_id: int):
        """Remove checkout product via handler."""
        return await self.db_handler.remove_checkout_product(
            shop_id, user_id, guest_id, variant_id
        )