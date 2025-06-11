from pydantic_ai import RunContext
from typing import Dict, Any

from .base_tool import BaseTool
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.logger import logger

class OrderTool(BaseTool):
    """Respond to questions related to order status"""
    @property
    def tool_name(self) -> str:
        return "order"
    
    def __init__(self):
        self.shop_admin_handler = ShopAdminHandler()
    
    async def run(self, ctx: RunContext[None]) -> Dict[str, Any]:
        try:
            shopId = ctx.deps.get("shopId")
            if not shopId:
                return {"email": "", "phone": "", "message": "No store info found."}

            support_info = await self.shop_admin_handler.get_support_contact(shopId)

            if not support_info:
                return {"email": "", "phone": "", "message": "Support contact not available."}
            
            return {
                "email": support_info.get("support_email", ""),
                "phone": support_info.get("support_phone", ""),
                "message": "Here's the support contact you requested."
            }
        except Exception as e:
            logger.error(f"Error in order tool: {e}")
            return {
                "email": None,
                "phone": None,
                "message": "Sorry, something went wrong while fetching the support contact. Please try again later."
            }