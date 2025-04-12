import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import FallbackResponse
from app.utils.logger import logger

class FallbackAgent(Agent):
    """Provides fallback responses when other agents fail"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "fallback_prompt.json"

        # Load prompt configuration
        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['fallback_agent_prompt']
        
        # Prepare system message
        self.system_message = self.prompt_config['system_message']

    async def process(self, context: AgentContext) -> AgentContext:
        try:
            # Prepare user message from template
            user_message = "\n\n".join(
                section.format(
                    user_message=context.user_message,
                    classification=context.classification or self.prompt_config['user_message_template']['unknown_value'],
                    response=context.response or self.prompt_config['user_message_template']['unknown_value'],
                    categories=(
                        [cat["name"] for cat in context.categories] 
                        if context.categories 
                        else self.prompt_config['user_message_template']['unknown_value']
                    )
                )
                for section in self.prompt_config['user_message_template']['sections']
            )

            result = await DeepseekAIClient.generate(
                model_class=FallbackResponse,
                user_message=user_message,
                system_message=self.system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens']
            )

            # Construct response from components
            response_text = result.apology
            if result.clarification_request:
                response_text += f" {result.clarification_request}"
            response_text += f" {result.suggestion}"
            
            context.response = response_text
            logger.info(f"FallbackAgent generated response: {context.response}")
            
            return context
        
        except Exception as e:
            logger.error(f"Error in FallbackAgent: {str(e)}", exc_info=True)
            
            # Use default response from config
            context.response = self.prompt_config['response_structure']['default_response']
            return context