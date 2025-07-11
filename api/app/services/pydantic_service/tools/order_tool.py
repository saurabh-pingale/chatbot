from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.logger import logger

class OrderTool(BaseTool):
    """Tool to get support contact information for order-related queries"""
    
    def __init__(self):
        self.shop_admin_handler = ShopAdminHandler()
    
    @property
    def tool_name(self) -> str:
        return "order"
    
    @property
    def description(self) -> str:
        return (
            "Use this tool for any order-related questions including tracking orders, refunds, damaged items, delivery delays, or cancellations.\n\n"
            "Important:\n"
            "- You MUST NOT generate any assumptions about the order status, delivery time, or tracking updates.\n"
            "- This tool will return only the store's support contact information.\n"
            "- Your response MUST politely direct the user to contact support using the email/phone returned by this tool.\n"
            "- NEVER mention a specific order status or delivery estimate."
        )
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    async def run(self, shop_id: str) -> Dict[str, Any]:
        """Get support contact information for the shop"""
        try:
            logger.info(f"Order tool called for shop ID: {shop_id}")
            
            if not shop_id:
                return {
                    "answer": "Support contact is currently unavailable.",
                    "email": "",
                    "phone": ""
                }
            
            support_info = await self.shop_admin_handler.get_support_contact(shop_id)
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
            logger.error(f"Error in order tool: {e}", exc_info=True)
            return {
                "answer": "An error occurred while fetching support details.",
                "email": "",
                "phone": ""
            }