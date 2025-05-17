from typing import Dict, Callable, Optional, Tuple
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.agent_context import AgentContext

class TransitionManager:
    def __init__(self):
        self._core_transitions = self._build_core_transitions()
        self._agent_transitions: Dict[Tuple[AgentState, str], AgentState] = {}
        self._processing_states = {
            state.classification_type: state 
            for state in AgentState 
            if state.is_processing_state
        }
    
    def _build_core_transitions(self) -> Dict[Tuple[AgentState, str], AgentState]:
        return {
            # INIT transitions
            (AgentState.INIT, "start"): AgentState.CLASSIFYING,
            (AgentState.INIT, "default"): AgentState.CLASSIFYING,

            # CLASSIFYING transitions
            (AgentState.CLASSIFYING, "default"): AgentState.FALLBACK,
            
            # EVALUATING transitions
            (AgentState.EVALUATING, "good_quality"): AgentState.COMPLETE,
            (AgentState.EVALUATING, "low_quality"): self._get_previous_processing_state,
            (AgentState.EVALUATING, "max_attempts"): AgentState.FALLBACK,
            (AgentState.EVALUATING, "default"): AgentState.FALLBACK,

            # CLASSIFYING transitions
            (AgentState.CLASSIFYING, "default"): AgentState.FALLBACK,

            # EVALUATING transitions
            (AgentState.EVALUATING, "good_quality"): AgentState.COMPLETE,
            (AgentState.EVALUATING, "low_quality"): self._get_previous_processing_state,
            (AgentState.EVALUATING, "max_attempts"): AgentState.FALLBACK,
            (AgentState.EVALUATING, "default"): AgentState.FALLBACK,
            
            # FALLBACK transitions
            (AgentState.FALLBACK, "complete"): AgentState.COMPLETE,
            (AgentState.FALLBACK, "default"): AgentState.ERROR,

            # COMPLETE transitions 
            (AgentState.COMPLETE, "default"): AgentState.INIT
        }
    
    def register_agent_transition(self, from_state: AgentState, condition: str, to_state: AgentState) -> None:
        """Register an agent-specific transition"""
        self._agent_transitions[(from_state, condition)] = to_state
    
    def get_next_state(self, current_state: AgentState, condition: str, context: AgentContext) -> AgentState:
        """Determine the next state based on rules"""
        # 1. Check agent-specific transitions first
        transition = self._agent_transitions.get((current_state, condition))
        if transition:
            return transition
        
        # 2. Check core transitions
        transition = self._core_transitions.get((current_state, condition))
        if callable(transition):
            return transition(context)
        if transition:
            return transition
            
        # 3. Default fallback
        return AgentState.FALLBACK
    
    def _get_previous_processing_state(self, context: AgentContext) -> AgentState:
        """Get processing state to return to during evaluation"""
        if context.classification and context.classification in self._processing_states:
            return self._processing_states[context.classification]
        return AgentState.FALLBACK