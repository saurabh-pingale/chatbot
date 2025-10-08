from typing import Dict, Any, Optional
from app.dbhandlers.shop_config_handler import ShopConfigHandler

class ShopConfigService:
    def __init__(self):
        self.db_handler = ShopConfigHandler()

    async def get_shop_pk(self, shop_id: str, session) -> Optional[int]:
        return await self.db_handler.get_shop_pk(shop_id, session)

    async def get_shop_config(self, shop_id: str) -> Dict[str, Any]:
        """
        Retrieves consolidated shop configuration.
        """
        return await self.db_handler.get_shop_config(shop_id) 