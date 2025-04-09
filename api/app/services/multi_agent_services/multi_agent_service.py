from fastapi import HTTPException
from typing import Dict, Any

from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.state_machine import StateMachine

from app.services.multi_agent_services.state_machine_service import StateMachineService
from app.utils.logger import logger

class MultiAgentService:
    """Service that coordinates the multi-agent system"""
    
    def __init__(self):
        self.state_machine = StateMachine()
        self._setup_state_machine()
    
    def _setup_state_machine(self):
        """Set up the state machine with agents and transitions"""
        # Register agents and transitions using the StateMachineService
        StateMachineService.register_agents(self.state_machine)
        StateMachineService.register_transitions(self.state_machine)
    
    async def process_message(self, namespace: str, user_message: str) -> Dict[str, Any]:
        """Process a user message through the multi-agent system"""
        try:
            # Reset state machine
            self.state_machine.state = AgentState.INIT
            
            # Create initial context
            context = AgentContext(
                user_message=user_message,
                namespace=namespace,
                max_attempts=3
            )
            
            # Execute state machine
            result_context = await self.state_machine.execute(context)
            
            # Check for errors
            if result_context.metadata.get("final_state") == "error":
                error_msg = result_context.metadata.get("error", "Unknown error")
                logger.error(f"Agent processing error: {error_msg}")
                
                # Even on error, try to return something useful
                if not result_context.response:
                    result_context.response = (
                        "I'm sorry, I encountered an issue while processing your request. "
                        "Please try again or ask a different question."
                    )
            
            # Return the response and any products/categories
            return {
                "answer": result_context.response,
                "products": result_context.products or [],
                "categories": [{"name": cat["name"]} for cat in result_context.categories] if result_context.categories else [],
            }
            
        except Exception as error:
            logger.error(f"Error in agent router: {str(error)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail="Failed to process your request"
            )