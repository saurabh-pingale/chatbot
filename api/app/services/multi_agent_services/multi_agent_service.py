import time
from fastapi import HTTPException
from typing import Dict, Any
from datetime import datetime
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.context.agent_state import AgentState
from app.multi_agent.context.agent_config import AgentConfig
from app.multi_agent.context.agent_registry import AgentRegistry
from app.multi_agent.context.transition_manager import TransitionManager
from app.multi_agent.context.state_machine import StateMachine
from app.utils.logger import logger

class MultiAgentService:
    def __init__(self):
        init_start = time.perf_counter()
        
        self.agent_config = AgentConfig()
        self.agent_registry = AgentRegistry()
        self.transition_manager = TransitionManager()
        
        self._register_core_components()
        self._register_agents()
        self._register_transitions()
        
        self.state_machine = StateMachine(
            self.transition_manager,
            self.agent_registry
        )
        
        logger.info(f"Agent system initialized in {time.perf_counter() - init_start:.4f}s")

    def _register_core_components(self) -> None:
        """Register immutable core agents"""
        self.agent_registry.register_core_agents()

        classifier_config = next(
            (a for a in self.agent_config.get_agent_configs() 
             if a["state"] == "CLASSIFYING"),
            None
        )
        if classifier_config:
            state = AgentState[classifier_config["state"]]
            agent_class = self.agent_config.get_agent_class(classifier_config["agent_class"])
            self.agent_registry.register_agent(state, agent_class())

    def _register_agents(self) -> None:
        """Register all agents from config"""
        for agent_config in self.agent_config.get_agent_configs():
            state = AgentState[agent_config["state"]]
            if not self.agent_registry.get_agent(state):
                agent_class = self.agent_config.get_agent_class(agent_config["agent_class"])
                self.agent_registry.register_agent(state, agent_class())

    def _register_transitions(self) -> None:
        """Automatically register transitions from config"""
        self.transition_manager.register_agent_transition(
            AgentState.INIT,
            "start",
            AgentState.CLASSIFYING
        )
        
        # Register classifier -> processing state transitions
        for agent_config in self.agent_config.get_agent_configs():
            state = AgentState[agent_config["state"]]
            if state.is_processing_state:
                for condition in agent_config.get("trigger_conditions", []):
                    self.transition_manager.register_agent_transition(
                        AgentState.CLASSIFYING,
                        condition,
                        state
                    )

        # Processing state transitions
        for state in AgentState:
            if state.is_processing_state:
                self.transition_manager.register_agent_transition(
                    state, "processed", AgentState.EVALUATING
                )
                self.transition_manager.register_agent_transition(
                    state, "low_confidence", AgentState.EVALUATING
                )
                self.transition_manager.register_agent_transition(
                    state, "default", AgentState.FALLBACK
                )
        
         # Evaluator transitions
        self.transition_manager.register_agent_transition(
            AgentState.EVALUATING, "good_quality", AgentState.COMPLETE
        )
        self.transition_manager.register_agent_transition(
            AgentState.EVALUATING, "low_quality", AgentState.FALLBACK
        )

    async def generate_agent_response(self, shopId: str, user_message: str, contents: list) -> Dict[str, Any]:
        """Process user message through the agent system"""
        try:
            self.state_machine.state = AgentState.INIT

            context = AgentContext(
                user_message=user_message,
                namespace=shopId,
                max_attempts=3,
                conversation_history=contents
            )
            
            result_context = await self.state_machine.execute(context)
            
            return {
                "answer": result_context.response or "Sorry, I couldn't process your request.",
                "products": result_context.products or [],
                "categories": [str(c) for c in (result_context.categories or []) if str(c).strip()],
                "history": self._update_conversation_history(
                    result_context.conversation_history,
                    user_message,
                    result_context.response
                )
            }
            
        except Exception as error:
            logger.error(f"Agent system error: {str(error)}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to process request")

    def _update_conversation_history(self, history: list, user_message: str, agent_response: str) -> list:
        """Update conversation history with new interaction"""
        if not history:
            return [{
                "id": 0,
                "user": user_message,
                "agent": agent_response,
                "timestamp": datetime.now().isoformat()
            }]
        
        last_incomplete = next(
            (msg for msg in reversed(history) if msg.get("user") and not msg.get("agent")),
            None
        )
        
        if last_incomplete:
            last_incomplete.update({
                "agent": agent_response,
                "timestamp": datetime.now().isoformat()
            })
        else:
            history.append({
                "id": max(msg["id"] for msg in history) + 1,
                "user": user_message,
                "agent": agent_response,
                "timestamp": datetime.now().isoformat()
            })
        
        return history