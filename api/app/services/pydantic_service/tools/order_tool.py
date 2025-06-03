from .base_tool import BaseTool
from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Dict, Any
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.logger import logger

class OrderTool(BaseTool):
    """Respond to questions related to order status"""
    @property
    def tool_name(self) -> str:
        return "order"
    
    def __init__(self):
        self.shop_admin_handler = ShopAdminHandler()
    
    async def run(self, ctx: RunContext[None], **kwargs) -> Dict[str, Any]:
        try:
            shopId = kwargs.get("shopId", "")

            support_info = await self.shop_admin_handler.get_support_contact(shopId)
            print("--------Support Info: {support_info}")
            
            if not support_info or not isinstance(support_info, dict):
                raise ModelRetry("Invalid support info, retrying...")
            
            return {
                "email": support_info.get("support_email"),
                "phone": support_info.get("support_phone")
            }
        except Exception as e:
            print(f"Error in order tool: {e}")
            raise ModelRetry(f"Failed to fetch support info: {str(e)}, retrying...")