from abc import ABC, abstractmethod
from app.multi_agent.context.agent_context import AgentContext

class Agent(ABC):
    """Base class for all agents in the system"""
    
    @abstractmethod
    async def process(self, context: AgentContext) -> AgentContext:
        """Process the current context and update it"""
        pass
    
    @property
    def name(self) -> str:
        return self.__class__.__name__
    
    def calculate_confidence(self, context: AgentContext) -> float:
        """Default confidence calculation, can be overridden by specific agents"""
        return 1.0
    