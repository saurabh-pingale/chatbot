from fastapi import HTTPException
from typing import Dict, Any

from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.state_machine import StateMachine

from app.multi_agent.agents.init import InitAgent
from app.multi_agent.agents.classifier import ClassifierAgent
from app.multi_agent.agents.greeting import GreetingAgent
from app.multi_agent.agents.product import ProductAgent  
from app.multi_agent.agents.evaluator import EvaluatorAgent
from app.multi_agent.agents.fallback import FallbackAgent

from app.utils.logger import logger

class AgentRouterService:
    """Service that coordinates the multi-agent system"""
    
    def __init__(self):
        self.state_machine = StateMachine()
        self._setup_state_machine()
    
    def _setup_state_machine(self):
        """Set up the state machine with agents and transitions"""
        # Register agents
        self.state_machine.register_agent(AgentState.INIT, InitAgent())  # Dummy agent for INIT state
        self.state_machine.register_agent(AgentState.CLASSIFYING, ClassifierAgent())
        self.state_machine.register_agent(AgentState.PROCESSING_GREETING, GreetingAgent())
        self.state_machine.register_agent(AgentState.PROCESSING_PRODUCT, ProductAgent())
        self.state_machine.register_agent(AgentState.EVALUATING, EvaluatorAgent())
        self.state_machine.register_agent(AgentState.FALLBACK, FallbackAgent())
        
        # Register transitions
        # From INIT
        self.state_machine.register_transition(AgentState.INIT, "start", AgentState.CLASSIFYING)
        self.state_machine.register_transition(AgentState.INIT, "default", AgentState.ERROR)
        
        # From CLASSIFYING
        self.state_machine.register_transition(AgentState.CLASSIFYING, "greeting", AgentState.PROCESSING_GREETING)
        self.state_machine.register_transition(AgentState.CLASSIFYING, "product", AgentState.PROCESSING_PRODUCT)
        self.state_machine.register_transition(AgentState.CLASSIFYING, "default", AgentState.FALLBACK)
        
        # From PROCESSING_GREETING
        self.state_machine.register_transition(AgentState.PROCESSING_GREETING, "processed", AgentState.EVALUATING)
        self.state_machine.register_transition(AgentState.PROCESSING_GREETING, "default", AgentState.FALLBACK)
        
        # From PROCESSING_PRODUCT
        self.state_machine.register_transition(AgentState.PROCESSING_PRODUCT, "processed", AgentState.EVALUATING)
        self.state_machine.register_transition(AgentState.PROCESSING_PRODUCT, "default", AgentState.FALLBACK)
        
        # From EVALUATING
        self.state_machine.register_transition(AgentState.EVALUATING, "good_quality", AgentState.COMPLETE)
        self.state_machine.register_transition(AgentState.EVALUATING, "low_quality", AgentState.FALLBACK)
        self.state_machine.register_transition(AgentState.EVALUATING, "max_attempts", AgentState.FALLBACK)
        self.state_machine.register_transition(AgentState.EVALUATING, "default", AgentState.FALLBACK)
        
        # From FALLBACK
        self.state_machine.register_transition(AgentState.FALLBACK, "complete", AgentState.COMPLETE)
        self.state_machine.register_transition(AgentState.FALLBACK, "default", AgentState.ERROR)
    
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