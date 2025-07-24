from typing import Dict, Any
from app.dbhandlers.shop_config_handler import ShopConfigHandler

class ShopConfigService:
    def __init__(self):
        self.db_handler = ShopConfigHandler()

    async def get_shop_config(self, shop_id: str) -> Dict[str, Any]:
        """
        Retrieves consolidated shop configuration.
        """
        return await self.db_handler.get_shop_config(shop_id) 