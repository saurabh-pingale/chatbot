import time
from typing import Dict, Any, Optional, List, Tuple
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.agents.base import Agent
from app.utils.logger import logger

class StateMachine:
    """Manages the flow between different agents with feedback-based rerouting"""
    
    def __init__(self):
        self.agents: Dict[AgentState, Agent] = {}
        self.transitions: Dict[Tuple[AgentState, str], AgentState] = {}
        self.state = AgentState.INIT
        self.previous_states: List[AgentState] = []
        self.confidence_threshold = 0.6
    
    def register_agent(self, state: AgentState, agent: Agent) -> None:
        """Register an agent for a particular state"""
        self.agents[state] = agent
    
    def register_transition(self, from_state: AgentState, condition: str, to_state: AgentState) -> None:
        """Register a transition between states"""
        self.transitions[(from_state, condition)] = to_state
    
    def get_next_state(self, condition: str, context: AgentContext) -> AgentState:
        """Get the next state based on the current state and condition, and context"""
        if self.state == AgentState.EVALUATING and condition == "low_quality":
            return self.get_previous_processing_state(context)

        next_state = self.transitions.get((self.state, condition))
        if next_state is None:
            next_state = self.transitions.get((self.state, "default"), AgentState.ERROR)
        return next_state
    
    def push_state(self) -> None:
        """Store current state for potential backtracking"""
        self.previous_states.append(self.state)

    def get_previous_processing_state(self, context: AgentContext) -> Optional[AgentState]:
        """Get the previous processing state based on the context classification"""
        if context.classification == "greeting":
            return AgentState.PROCESSING_GREETING
        elif context.classification == "product":
            return AgentState.PROCESSING_PRODUCT
        elif context.classification == "order":
            return AgentState.PROCESSING_ORDER

        return AgentState.FALLBACK
    
    async def execute(self, context: AgentContext) -> AgentContext:
        """Execute the state machine until completion or error"""
        max_transitions = 15 
        transitions = 0

        overall_start_time = time.perf_counter()
        
        while self.state not in (AgentState.COMPLETE, AgentState.ERROR) and transitions < max_transitions:
            current_agent = self.agents.get(self.state)
            if current_agent is None:
                self.state = AgentState.ERROR
                context.metadata["error"] = f"No agent registered for state {self.state}"
                break
            
            try:
                logger.info(f"State machine current state: {self.state}")

                self.push_state()

                agent_start_time = time.perf_counter()

                context = await current_agent.process(context)

                agent_end_time = time.perf_counter()
                logger.info(f"Agent '{current_agent.name}' processing took {agent_end_time - agent_start_time:.4f} seconds")

                if "feedback" in context.metadata and context.quality_score is not None:
                    context.add_feedback(
                        current_agent.name, 
                        context.quality_score,
                        context.metadata.get("feedback", "")
                    )

                if self.state == AgentState.PROCESSING_GREETING:
                    logger.info("Processing greeting, skipping evaluation")
                    self.state = AgentState.COMPLETE
                    context.metadata["skipped_evaluation"] = True
                    break

                if self.state in (AgentState.PROCESSING_PRODUCT, AgentState.PROCESSING_ORDER) and \
                   context.confidence_score is not None and context.confidence_score >= self.confidence_threshold:
                    logger.info(f"High confidence score ({context.confidence_score}), skipping evaluation")
                    self.state = AgentState.COMPLETE
                    context.metadata["skipped_evaluation"] = True
                    break
                
                condition = self._determine_transition_condition(context)
                next_state = self.get_next_state(condition, context)

                logger.info(f"State transition: {self.state} --({condition})--> {next_state}")

                self.state = next_state
                
            except Exception as e:
                context.metadata["error"] = str(e)
                self.state = AgentState.ERROR
            
            transitions += 1
        
        if transitions >= max_transitions:
            context.metadata["error"] = "Maximum state transitions exceeded"
            self.state = AgentState.ERROR
        
        if self.state == AgentState.ERROR:
            context.metadata["final_state"] = "error"
        else:
            context.metadata["final_state"] = "complete"

        overall_end_time = time.perf_counter()
        logger.info(f"Total state machine execution took {overall_end_time - overall_start_time:.4f} seconds")
            
        return context
    
    def _determine_transition_condition(self, context: AgentContext) -> str:
        """Determine the transition condition based on the current context"""
        if context.metadata.get("error"):
            return "error"
            
        if self.state == AgentState.INIT:
            return "start"
            
        elif self.state == AgentState.CLASSIFYING:
            return context.classification if context.classification else "default"
            
        elif self.state in (AgentState.PROCESSING_GREETING, AgentState.PROCESSING_PRODUCT):
            return "processed"
            
        elif self.state == AgentState.EVALUATING:
            if context.quality_score is not None:
                if context.quality_score < 5:
                    if context.attempts >= context.max_attempts:
                        return "max_attempts"
                    return "low_quality"
                return "good_quality"
            return "default"
            
        elif self.state == AgentState.FALLBACK:
            return "complete"
            
        return "default"