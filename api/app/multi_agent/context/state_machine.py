from typing import Optional
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.agent_context import AgentContext
from app.utils.logger import logger

class StateMachine:
    def __init__(self, transition_manager, agent_registry):
        self.transition_manager = transition_manager
        self.agent_registry = agent_registry
        self.state = AgentState.INIT
        self.previous_states = []
        self.confidence_threshold = 0.6
    
    async def execute(self, context: AgentContext) -> AgentContext:
        """Execute the state machine until completion"""
        max_transitions = 15
        transitions = 0

        if self.state == AgentState.INIT:
            self.state == AgentState.CLASSIFYING
        
        while not self._is_terminal_state() and transitions < max_transitions:
            transitions += 1
            agent = self.agent_registry.get_agent(self.state)
            
            if not agent:
                logger.error(f"No agent registered for state {self.state}")
                context.metadata["error"] = f"No agent for state {self.state}"
                self.state = AgentState.ERROR
                break
            
            try:
                logger.info(f"Executing {self.state.name} with {agent.__class__.__name__}")
                self._push_state()
                context = await agent.process(context)

                if self.state == AgentState.INIT:
                    condition = "start"
                else:
                    condition = self._determine_condition(context)
                
                next_state  = self.transition_manager.get_next_state(
                    self.state, condition, context
                )

                logger.info(f"Transitioning from {self.state.name} to {next_state.name} via '{condition}'")
                self.state = next_state
                
            except Exception as e:
                logger.error(f"Error in state {self.state.name}: {str(e)}", exc_info=True)
                context.metadata["error"] = str(e)
                self.state = AgentState.ERROR

        if transitions >= max_transitions:
            context.metadata["error"] = "Maximum state transitions exceeded"
            self.state = AgentState.ERROR
        
        context.metadata["final_state"] = self.state.name.lower()
        return context
    
    def _is_terminal_state(self) -> bool:
        return self.state in (AgentState.COMPLETE, AgentState.ERROR)
    
    def _push_state(self) -> None:
        """Store current state for potential backtracking"""
        self.previous_states.append(self.state)
    
    def _determine_condition(self, context: AgentContext) -> str:
        """Determine the transition condition based on context"""
        if context.metadata.get("error"):
            return "error"
        
        if self.state == AgentState.CLASSIFYING:
            return context.classification or "default"
        
        if self.state.is_processing_state:
            if context.confidence_score is not None:
                if context.confidence_score >= self.confidence_threshold:
                    return "processed"
                return "low_confidence"
            return "processed"
        
        if self.state == AgentState.EVALUATING:
            if context.quality_score is not None:
                if context.quality_score >= self.confidence_threshold:  
                    return "good_quality"
                return "low_quality"
            return "default"
        
        return "default"