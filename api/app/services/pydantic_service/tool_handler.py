import json
from typing import Dict, Type, Callable, Any
from pydantic import BaseModel

from app.models.api.response import GeneralResponse
from app.utils.logger import logger

class ToolHandler:
    """Registry for dynamic tool handling"""
    def __init__(self):
        self._response_models: Dict[str, Type[BaseModel]] = {}
        self._tool_processors: Dict[str, Callable[[Any, dict], None]] = {}

    def register_tool(self, tool_name: str, response_model: Type[BaseModel], 
                    processor: Callable[[Any, dict], None] = None):
        """Register a tool with its response model and processor"""
        self._response_models[tool_name] = response_model
        if processor:
            self._tool_processors[tool_name] = processor

    def get_response_model(self, tool_name: str) -> Type[BaseModel]:
        """Get the response model for a tool"""
        return self._response_models.get(tool_name, GeneralResponse)

    def tool_config(self, response_model: Type[BaseModel], processor: Callable[[Any, dict], None] = None, tool_name: str = None):
        """Decorator to register a tool's response model and processor."""
        def decorator(func_or_class_method): 
            name = tool_name or func_or_class_method.__name__
    
            self._response_models[name] = response_model
            if processor:
                self._tool_processors[name] = processor
            
            return func_or_class_method
        return decorator

    def process_tool_output(self, tool_name: str, response: BaseModel, tool_output: Any):
        """Process tool output using the registered processor"""
        logger.info(f"Tool Name: {tool_name}")
        logger.info(f"Tool Output: {tool_output}")
        if isinstance(tool_output, str):
            try:
                tool_output = json.loads(tool_output)
            except json.JSONDecodeError:
                tool_output = {}
        if tool_name in self._tool_processors:
            self._tool_processors[tool_name](response, tool_output)