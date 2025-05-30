from abc import ABC, abstractmethod
from pydantic_ai import RunContext
from typing import Any, Dict

class BaseTool(ABC):
    """Abstract base class for all tools"""
    
    @property
    @abstractmethod
    def tool_name(self) -> str:
        """Return the unique name for this tool"""
        pass
        
    @abstractmethod
    async def run(self, ctx: RunContext[None], **kwargs) -> Dict[str, Any]:
        """Execute the tool with given context and return results"""
        pass