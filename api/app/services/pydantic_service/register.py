from typing import Optional, Callable, Type, Any, Tuple, List
from pydantic import BaseModel
import functools

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.pydantic_service.tools.product_tool import ProductTool
from app.services.pydantic_service.tools.order_tool import OrderTool
from app.services.pydantic_service.tools.terms_tool import TermsTool
from app.models.api.response import (
    GeneralResponse,
    ProductResponse,
    OrderResponse,
)

class Register:
    """Handles tool registration for LLMService"""
    
    def __init__(self, tool_handler):
        self.tool_handler = tool_handler
    
    def register_all_tools(self) -> Tuple[List[Callable], List[Type[BaseModel]]]:
        """Register all available tools and return them as a list of tools and response models."""
        tool_registrations = [
            self._register_product_tool(),
            self._register_order_tool(),
            self._register_terms_tool(),
        ]
        
        tools = [reg[0] for reg in tool_registrations]
        response_models = [reg[1] for reg in tool_registrations]

        response_models.append(GeneralResponse)
        
        return tools, response_models

    def _register_product_tool(self) -> Tuple[Callable, Type[BaseModel]]:
        """Register product tool"""
        product_tool = ProductTool()
        return self._register_tool_instance(
            product_tool,
            response_model=ProductResponse,
            processor=None
        )

    def _register_order_tool(self) -> Tuple[Callable, Type[BaseModel]]:
        """Register order tool"""
        order_tool = OrderTool()
        return self._register_tool_instance(
            order_tool,
            response_model=OrderResponse,
            processor=None
        )

    def _register_terms_tool(self) -> Tuple[Callable, Type[BaseModel]]:
        """Register terms tool"""
        terms_tool = TermsTool()
        return self._register_tool_instance(
            terms_tool,
            response_model=GeneralResponse,
            processor=None
        )

    def _register_tool_instance(self, tool_instance: BaseTool, response_model: Type[BaseModel],
                              processor: Optional[Callable[[Any, dict], None]] = None) -> Tuple[Callable, Type[BaseModel]]:
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
        
        return configured_tool, response_model