from typing import Dict
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.agents.base import Agent
from app.multi_agent.agents.init import InitAgent
from app.multi_agent.agents.evaluator import EvaluatorAgent
from app.multi_agent.agents.fallback import FallbackAgent

class AgentRegistry:
    def __init__(self):
        self._agents: Dict[AgentState, Agent] = {}
    
    def register_core_agents(self) -> None:
        """Register the immutable core agents"""
        self._agents.update({
            AgentState.INIT: InitAgent(),
            AgentState.EVALUATING: EvaluatorAgent(),
            AgentState.FALLBACK: FallbackAgent()
        })
    
    def register_agent(self, state: AgentState, agent: Agent) -> None:
        """Register a non-core agent"""
        if state in (AgentState.INIT, AgentState.EVALUATING, AgentState.FALLBACK):
            raise ValueError(f"Cannot override core agent for state {state}")
        self._agents[state] = agent
    
    def get_agent(self, state: AgentState) -> Agent:
        """Get agent for a state"""
        return self._agents.get(state)