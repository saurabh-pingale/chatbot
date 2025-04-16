from fastapi import HTTPException
from typing import Dict, Any
from datetime import datetime
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
    
    async def generate_agent_response(self, namespace: str, user_message: str, contents: list) -> Dict[str, Any]:
        """Process a user message through the multi-agent system"""
        try:
            # Reset state machine
            self.state_machine.state = AgentState.INIT
            
            # Create initial context
            context = AgentContext(
                user_message=user_message,
                namespace=namespace,
                max_attempts=3,
                conversation_history=contents
            )
            
            # Execute state machine
            result_context = await self.state_machine.execute(context)

            # Update the conversation history with the agent's response
            updated_history = self._update_conversation_history(
                result_context.conversation_history,
                user_message,
                result_context.response
            )
            
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

            categories = [
                str(cat) for cat in (result_context.categories or [])
                if str(cat).strip()
            ]
            
            # Return the response and any products/categories
            return {
                "answer": result_context.response,
                "products": result_context.products or [],
                "categories": categories,
                "history": updated_history
            }
            
        except Exception as error:
            logger.error(f"Error in agent router: {str(error)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail="Failed to process your request"
            )

    def _update_conversation_history(self, history: list, user_message: str, agent_response: str) -> list:
        """Update the conversation history with the latest interaction"""
        if not history:
            # If no history exists, create a new entry
            return [{
                "id": 0,
                "user": user_message,
                "agent": agent_response,
                "timestamp": datetime.now().isoformat()
            }]
        
        # Find the last incomplete message (user message without agent response)
        last_incomplete = None
        for msg in reversed(history):
            if msg.get("user") and not msg.get("agent"):
                last_incomplete = msg
                break
        
        if last_incomplete:
            # Update the existing incomplete message
            last_incomplete["agent"] = agent_response
            last_incomplete["timestamp"] = datetime.now().isoformat()
        else:
            # Add a new message if all previous ones are complete
            new_id = max(msg["id"] for msg in history) + 1 if history else 0
            history.append({
                "id": new_id,
                "user": user_message,
                "agent": agent_response,
                "timestamp": datetime.now().isoformat()
            })
        
        return history