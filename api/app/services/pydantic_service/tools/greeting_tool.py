from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Any, Dict

from .base_tool import BaseTool
from app.utils.logger import logger

class GreetingTool(BaseTool):
    """Handle friendly greetings and welcome messages"""
    
    @property
    def tool_name(self) -> str:
        return "greeting"
    
    async def run(self, ctx: RunContext[None], **kwargs) -> Dict[str, Any]:
        try:
            return {"categories": []}
        except Exception as e:
            logger.error(f"Error in greeting tool: {e}")
            raise ModelRetry("Failed to fetch categories, retrying...")