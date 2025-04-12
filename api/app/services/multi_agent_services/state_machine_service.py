from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.state_machine import StateMachine

from app.multi_agent.agents.init import InitAgent
from app.multi_agent.agents.classifier import ClassifierAgent
from app.multi_agent.agents.greeting import GreetingAgent
from app.multi_agent.agents.product import ProductAgent  
from app.multi_agent.agents.evaluator import EvaluatorAgent
from app.multi_agent.agents.fallback import FallbackAgent

class StateMachineService:
    """Service that manages the state machine setup and operations"""
    
    @staticmethod
    def register_agents(state_machine: StateMachine):
        """Register all agents with the state machine"""
        state_machine.register_agent(AgentState.INIT, InitAgent())  # Dummy agent for INIT state
        state_machine.register_agent(AgentState.CLASSIFYING, ClassifierAgent())
        state_machine.register_agent(AgentState.PROCESSING_GREETING, GreetingAgent())
        state_machine.register_agent(AgentState.PROCESSING_PRODUCT, ProductAgent())
        state_machine.register_agent(AgentState.EVALUATING, EvaluatorAgent())
        state_machine.register_agent(AgentState.FALLBACK, FallbackAgent())
    
    @staticmethod
    def register_transitions(state_machine: StateMachine):
        """Register all state transitions with the state machine"""
        # From INIT
        state_machine.register_transition(AgentState.INIT, "start", AgentState.CLASSIFYING)
        state_machine.register_transition(AgentState.INIT, "default", AgentState.ERROR)
        
        # From CLASSIFYING
        state_machine.register_transition(AgentState.CLASSIFYING, "greeting", AgentState.PROCESSING_GREETING)
        state_machine.register_transition(AgentState.CLASSIFYING, "product", AgentState.PROCESSING_PRODUCT)
        state_machine.register_transition(AgentState.CLASSIFYING, "default", AgentState.FALLBACK)
        
        # From PROCESSING_GREETING
        state_machine.register_transition(AgentState.PROCESSING_GREETING, "processed", AgentState.EVALUATING)
        state_machine.register_transition(AgentState.PROCESSING_GREETING, "default", AgentState.FALLBACK)
        
        # From PROCESSING_PRODUCT
        state_machine.register_transition(AgentState.PROCESSING_PRODUCT, "processed", AgentState.EVALUATING)
        state_machine.register_transition(AgentState.PROCESSING_PRODUCT, "default", AgentState.FALLBACK)
        
        # From EVALUATING
        state_machine.register_transition(AgentState.EVALUATING, "good_quality", AgentState.COMPLETE)
        state_machine.register_transition(AgentState.EVALUATING, "low_quality", AgentState.FALLBACK)
        state_machine.register_transition(AgentState.EVALUATING, "max_attempts", AgentState.FALLBACK)
        state_machine.register_transition(AgentState.EVALUATING, "default", AgentState.FALLBACK)
        
        # From FALLBACK
        state_machine.register_transition(AgentState.FALLBACK, "complete", AgentState.COMPLETE)
        state_machine.register_transition(AgentState.FALLBACK, "default", AgentState.ERROR)