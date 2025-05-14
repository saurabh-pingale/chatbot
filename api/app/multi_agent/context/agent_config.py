import json
import importlib
from pathlib import Path
from app.multi_agent.context.agent_state import AgentState

class AgentConfig:
    def __init__(self):
        config_path = Path(__file__).parent / "agents_config.json"
        with open(config_path) as f:
            self.config = json.load(f)
    
    def get_agent_classes(self):
        """Dynamically import agent classes from config"""
        agents = []
        for agent_config in self.config["agents"]:
            module_path, class_name = agent_config["agent_class"].rsplit(".", 1)
            module = importlib.import_module(module_path)
            agent_class = getattr(module, class_name)
            agents.append({
                "state": AgentState[agent_config["state"]],
                "class": agent_class
            })
        return agents
    
    def get_transitions(self):
        """Get all transitions from config"""
        transitions = []
        for agent_config in self.config["agents"]:
            for transition in agent_config.get("transitions", []):
                transitions.append({
                    "from_state": AgentState[transition["from_state"]],
                    "condition": transition["condition"],
                    "to_state": AgentState[transition["to_state"]]
                })
        return transitions