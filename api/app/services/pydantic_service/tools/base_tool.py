from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseTool(ABC):
    """Abstract base class for all Claude Function Tools"""
    
    @property
    @abstractmethod
    def tool_name(self) -> str:
        """Return the unique name for this tool"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Return the description for this tool"""
        pass
    
    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, Any]:
        """Return the input schema for this tool"""
        pass
        
    @abstractmethod
    async def run(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters and return results"""
        pass
    
    def to_claude_tool(self) -> Dict[str, Any]:
        """Convert tool to Claude API format"""
        return {
            "name": self.tool_name,
            "description": self.description,
            "input_schema": self.input_schema
        }