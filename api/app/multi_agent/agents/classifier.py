import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.pydantic_ai_client import DeepseekAIClient 
from app.models.api.agent_router import MessageClassification
from app.utils.logger import logger

class ClassifierAgent(Agent):
    """Classifies the user input to determine which agent should handle it"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "classifier_prompt.json"

        # Load the prompt configuration from JSON
        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['classifier_agent_prompt']
        
        # Prepare system message with examples
        self.system_message = self.prompt_config['system_message'] + "\n\nExamples:\n"
        for example in self.prompt_config['examples']:
            self.system_message += f"- \"{example['user_message']}\" -> {example['classification']}\n"

    async def process(self, context: AgentContext) -> AgentContext:
        try:
            result = await DeepseekAIClient.generate(
                model_class=MessageClassification,
                user_message=context.user_message,
                system_message=self.system_message,
                temperature=self.prompt_config['parameters']['temperature']  
            )

            context.classification = result.classification.value
            context.metadata["classification_confidence"] = result.confidence
            context.metadata["classification_reasoning"] = result.reasoning

            logger.info(f"Message classified as: {context.classification}")
            logger.info(f"Classification confidence: {result.confidence}")
            logger.info(f"Classification reasoning: {result.reasoning}")

            return context

        except Exception as e:
            logger.error(f"Error in ClassifierAgent: {str(e)}", exc_info=True)
            
            # Fallback classification using JSON config
            if any(term in context.user_message.lower() 
                  for term in self.prompt_config['parameters']['fallback_logic']['product_terms']):
                context.classification = "product"
            else:
                context.classification = self.prompt_config['parameters']['fallback_logic']['default_classification']
                
            logger.info(f"Fallback classification: {context.classification}")
            context.metadata["error"] = f"Classification error: {str(e)}"
            return context   