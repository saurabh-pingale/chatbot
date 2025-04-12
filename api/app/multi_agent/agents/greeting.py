import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.utils.logger import logger
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import GreetingResponse

class GreetingAgent(Agent):
    """Handles greeting messages and general conversation"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "greeting_prompt.json"
        # Load prompt configuration
        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['greeting_agent_prompt']
    
    async def process(self, context: AgentContext) -> AgentContext:
        try:
            # Extract categories if available
            categories_str = ""
            if context.categories and len(context.categories) > 0:
                category_names = [cat["name"] for cat in context.categories if cat["name"]]
                categories_str = ", ".join(category_names[:3])  # Limit to 3 categories

            # Check if we have feedback from previous attempts
            feedback_instruction = ""
            previous_response = ""

            if context.feedback_history and context.attempts > 0:
                # Get the most recent feedback
                recent_feedback = next(
                    (fb for fb in reversed(context.feedback_history) 
                     if fb["agent"] == "EvaluatorAgent"),
                    None
                )

                if recent_feedback:
                    feedback_instruction = self.prompt_config['feedback_instruction_template']['template'].format(
                        quality_score=recent_feedback['quality_score'],
                        feedback=recent_feedback['feedback']
                    )
                    previous_response = f"Previous response: {context.response}\n\n"

            # Build conversation history context
            history_context = self._build_history_context(context)

            # Build system message
            system_message = self.prompt_config['base_system_message'].format(history=history_context)
            if feedback_instruction:
                system_message += f"\n\n{feedback_instruction}\n\n{previous_response}"
            if categories_str:
                system_message += f"\n\n{self.prompt_config['category_mention_template'].format(categories=categories_str)}"
            
            # Determine cache settings
            bypass_cache = (
                context.attempts > 0 and 
                self.prompt_config['cache_settings']['bypass_cache_on_retry']
            )
            cache_ttl = (
                self.prompt_config['cache_settings']['with_categories_ttl'] if categories_str
                else self.prompt_config['cache_settings']['default_ttl']
            )

            response = await DeepseekAIClient.generate(
                model_class=GreetingResponse,
                user_message=context.user_message,
                system_message=system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens'],
                bypass_cache=bypass_cache,
                cache_ttl=cache_ttl
            )

            # Build final response
            context.response = f"{response.welcome_message} {response.product_prompt}"
            if response.category_mention:
                context.response += f" {response.category_mention}"

            # Store whether this was a cache hit in metadata for monitoring
            context.metadata["cache_hit"] = not bypass_cache

            logger.info(f"GreetingAgent processed message: {context.user_message}")
            logger.info(f"Generated response: {context.response}")
            
            if self.prompt_config['logging']['include_response_structure']:
                logger.info(f"Response structure: {response.model_dump_json()}")
            if self.prompt_config['logging']['include_cache_status']:
                logger.info(f"Cache status: {'bypassed' if bypass_cache else 'enabled'}")
            if self.prompt_config['logging']['log_retry_attempts'] and context.attempts > 0:
                logger.info(f"GreetingAgent RETRY #{context.attempts} generated improved response")

            return context
        except Exception as e:
            logger.error(f"Error in GreetingAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Greeting agent error: {str(e)}"
            context.response = self.prompt_config['response_structure']['default_response']
            return context

    def _build_history_context(self, context: AgentContext) -> str:
        """Format conversation history for the prompt"""
        if not context.conversation_history:
            return "No previous conversation"
        
        history_lines = []
        for msg in context.conversation_history:
            if msg.get("user"):
                history_lines.append(f"User: {msg['user']}")
            if msg.get("agent"):
                history_lines.append(f"Assistant: {msg['agent']}")
        
        return "\n".join(history_lines[-4:])  # Show last 4 exchanges