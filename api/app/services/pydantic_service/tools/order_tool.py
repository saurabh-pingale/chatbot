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
            tool_usage_tracker = ctx.deps.get("tool_usage_tracker", {})
            total_calls = tool_usage_tracker.get("total_non_product_calls", 0)
            max_calls = tool_usage_tracker.get("max_non_product_calls", 10)
            
            if total_calls >= max_calls:
                logger.warning(f"Order tool call limit exceeded: {total_calls}/{max_calls}")
                tool_usage_tracker["order_tool_blocked"] = True 
                return {
                    "answer": "",
                    "email": "",
                    "phone": "",
                    "limit_exceeded": True 
                }
            
            tool_usage_tracker["total_non_product_calls"] = total_calls + 1
            tool_usage_tracker["order_call_count"] = tool_usage_tracker.get("order_call_count", 0) + 1
            logger.info(f"Order tool called. Total non-product calls: {tool_usage_tracker['total_non_product_calls']}")
            
            shopId = ctx.deps.get("shopId")
            logger.info(f"Shop ID in Order Tool: {shopId}")
            if not shopId:
                return {
                    "answer": "Support contact is currently unavailable.",
                    "email": "",
                    "phone": ""
                }

            support_info = await self.shop_admin_handler.get_support_contact(shopId)
            logger.info(f"Support Info: {support_info}")

            if not support_info or (not support_info.get("support_email") and not support_info.get("support_phone")):
                return {
                    "answer": "We couldn't find any support contact at the moment.",
                    "email": "",
                    "phone": ""
                } 
        
            return {
                "answer": "",
                "email": support_info.get('support_email', ''),
                "phone": support_info.get('support_phone', ''),
                "success": True
            }

        except Exception as e:
            logger.error(f"Error in order tool: {e}")
            return {
                "answer": "An error occurred while fetching support details.",
                "email": "",
                "phone": ""
            }