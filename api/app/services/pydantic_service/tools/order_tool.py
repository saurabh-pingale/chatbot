from typing import Dict, Any

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.models.api.response import OrderResponse
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
        return """ 
        Use this tool for ANY order-related questions: tracking, refunds, damaged items, delivery issues, cancellations, order status.\n

        CRITICAL RULES:
        - Tool returns ONLY store contact information (email/phone).
        - NEVER generate fake order details, tracking info, delivery estimates or contact information.

        Example triggers: "Where is my order?", "I want to return my product" , "how do i track my product", "My item is damaged", "I want a refund", etc.
        """;
    
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
                return OrderResponse(
                    answer= "Support contact is currently unavailable.",
                    email= "",
                    phone= "",
                    success= False
                )
            
            support_info = await self.shop_admin_handler.get_support_contact(shop_id)
            logger.info(f"Support Info: {support_info}")
            
            if not support_info or (not support_info.get("support_email") and not support_info.get("support_phone")):
                return OrderResponse(
                    answer= "We couldn't find any support contact at the moment.",
                    email= "",
                    phone= "",
                    success= False
                )
        
            return OrderResponse(
                answer= "",
                email= support_info.get('support_email', ''),
                phone= support_info.get('support_phone', ''),
                success= True
            )
            
        except Exception as e:
            logger.error(f"Error in order tool: {e}", exc_info=True)
            return OrderResponse(
                answer= "An error occurred while fetching support details.",
                email= "",
                phone= "",
                success= False
            )