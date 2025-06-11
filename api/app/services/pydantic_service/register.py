from typing import Optional, Callable, Type, Any
from pydantic import BaseModel
import functools

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.pydantic_service.tools.greeting_tool import GreetingTool
from app.services.pydantic_service.tools.product_tool import ProductTool
from app.services.pydantic_service.tools.order_tool import OrderTool
from app.services.pydantic_service.tools.terms_tool import TermsTool
from app.models.api.response import (
    GreetingResponse,
    ProductResponse,
    OrderResponse,
    TermsResponse
)

class Register:
    """Handles tool registration for LLMService"""
    
    def __init__(self, tool_handler):
        self.tool_handler = tool_handler
    
    def register_all_tools(self):
        """Register all available tools and return them as a list."""
        tools = [
            self._register_greeting_tool(),
            self._register_product_tool(),
            self._register_order_tool(),
            self._register_terms_tool(),
        ]
        return tools

    def _register_greeting_tool(self):
        """Register greeting tool"""
        greeting_tool = GreetingTool()
        return self._register_tool_instance(
            greeting_tool,
            response_model=GreetingResponse,
            processor=lambda response, output: setattr(
                response, 
                'category_mention', 
                f"Some popular categories: {', '.join(output['categories'])}"
            ) if output.get("categories") else None
        )

    def _register_product_tool(self):
        """Register product tool"""
        product_tool = ProductTool()
        return self._register_tool_instance(
            product_tool,
            response_model=ProductResponse,
            processor=None
        )

    def _register_order_tool(self):
        """Register order tool"""
        order_tool = OrderTool()
        return self._register_tool_instance(
            order_tool,
            response_model=OrderResponse,
            processor=None
        )

    def _register_terms_tool(self):
        """Register terms tool"""
        terms_tool = TermsTool()
        return self._register_tool_instance(
            terms_tool,
            response_model=TermsResponse,
            processor=lambda response, output: setattr(response, 'sources', output['terms'])
            if output.get('terms') else None
        )

    def _register_tool_instance(self, tool_instance: BaseTool, response_model: Type[BaseModel],
                              processor: Optional[Callable[[Any, dict], None]] = None):
        """
        Helper method to register a tool instance with the agent.
        It creates a correctly named wrapper around the tool's run method to avoid naming conflicts.
        """
        tool_function = tool_instance.run

        @functools.wraps(tool_function)
        async def tool_wrapper(*args, **kwargs):
            return await tool_function(*args, **kwargs)
        
        tool_wrapper.__name__ = tool_instance.tool_name

        configured_tool = self.tool_handler.tool_config(
            response_model=response_model,
            processor=processor,
            tool_name=tool_instance.tool_name
        )(tool_wrapper)
        
        return configured_tool