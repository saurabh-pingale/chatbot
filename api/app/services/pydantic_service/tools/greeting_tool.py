from .base_tool import BaseTool
from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Any, Dict

class GreetingTool(BaseTool):
    """Handle friendly greetings and welcome messages"""
    
    @property
    def tool_name(self) -> str:
        return "greeting"
    
    async def run(self, ctx: RunContext[None], **kwargs) -> Dict[str, Any]:
        try:
            # category_names = get_all_categories()
            # return {"categories": category_names[:3]}
            return {"categories": []}
        except Exception as e:
            print(f"Error in greeting tool: {e}")
            raise ModelRetry("Failed to fetch categories, retrying...")