from typing import Dict, Any, List

from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.pydantic_service.tools.product_tool import ProductTool
from app.services.pydantic_service.tools.order_tool import OrderTool
from app.services.pydantic_service.tools.terms_tool import TermsTool
from app.services.pydantic_service.tools.greeting_tool import GreetingTool
from app.utils.logger import logger

class ToolRegistry:
    """Registry for managing Claude Function Tools"""
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self._register_tools()
    
    def _register_tools(self):
        """Register all available tools"""
        tools_to_register = [
            GreetingTool(),
            ProductTool(),
            OrderTool(),
            TermsTool()
        ]
        
        for tool in tools_to_register:
            self.tools[tool.tool_name] = tool
    
    def get_tool(self, tool_name: str) -> BaseTool:
        """Get a tool by name"""
        return self.tools.get(tool_name)
    
    def get_all_tools_for_claude(self) -> List[Dict[str, Any]]:
        """Get all tools in Claude API format"""
        return [tool.to_claude_tool() for tool in self.tools.values()]
    
    async def run_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Run a tool with given parameters"""
        tool = self.get_tool(tool_name)
        if not tool:
            logger.error(f"Tool not found: {tool_name}")
            return {"error": f"Tool '{tool_name}' not found"}
        
        try:
            result = await tool.run(**kwargs)
            logger.info(f"Tool {tool_name} executed successfully")
            return result
        except Exception as e:
            logger.error(f"Error running tool {tool_name}: {e}", exc_info=True)
            return {"error": f"Error running tool {tool_name}: {str(e)}"}