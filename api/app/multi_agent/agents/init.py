from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext

class InitAgent(Agent):
    """Concrete agent for INIT state that just passes the context through"""
    async def process(self, context: AgentContext) -> AgentContext:
        return context