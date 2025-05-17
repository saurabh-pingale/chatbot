import json
import importlib
from pathlib import Path
from typing import Dict, List, Any
from app.multi_agent.context.agent_state import AgentState

class AgentConfig:
    def __init__(self):
        config_path = Path(__file__).parent.parent / "agents" / "agents_config.json"
        with open(config_path) as f:
            self.config = json.load(f)
    
    def get_agent_configs(self) -> List[Dict[str, Any]]:
        """Get all agent configurations with their metadata"""
        return self.config["agents"]
    
    def get_agent_class(self, class_path: str) -> Any:
        """Dynamically import an agent class"""
        module_path, class_name = class_path.rsplit(".", 1)
        module = importlib.import_module(module_path)
        return getattr(module, class_name)