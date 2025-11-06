from typing import List, Dict, Any
import uuid

from app.dbhandlers.cart_handler import CartHandler

class CartService:
    def __init__(self):
        self.handler = CartHandler()

    async def load_cart(self, shop_pk: int, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Load full cart from DB."""
        return await self.handler.fetch_cart_items(user_id, shop_pk)
            
    async def add_to_cart(self, shop_pk: int, user_id: uuid.UUID, variant_id: int, quantity: int) -> Dict[str, Any]:
        """Add/update item in DB."""
        return await self.handler.add_or_update_item(user_id, shop_pk, variant_id, quantity)
                
    async def remove_from_cart(self, shop_pk: int, user_id: uuid.UUID, variant_id: int) -> bool:
        """Remove item from DB."""
        return await self.handler.remove_item(user_id, shop_pk, variant_id)        

    async def clear_cart(self, shop_pk: int, user_id: uuid.UUID) -> bool:
        """Clear cart post-checkout."""
        return await self.handler.clear_cart(user_id, shop_pk)
                