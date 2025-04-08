from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import clean_response_from_llm
from app.utils.logger import logger

class ClassifierAgent(Agent):
    """Classifies the user input to determine which agent should handle it"""
    
    async def process(self, context: AgentContext) -> AgentContext:
        prompt = f"""
        Classify the following user message as either 'greeting' or 'product'. 
        Reply with ONLY 'greeting' or 'product'.
        
        Examples:
        User: "Hello there"
        Classification: greeting
        
        User: "Show me your laptops"
        Classification: product
        
        User: "Do you have any discount on phones?"
        Classification: product
        
        User: "How are you doing today?"
        Classification: greeting
        
        User message: "{context.user_message}"
        Classification:
        """
        
        response = await generate_text_from_huggingface(prompt)
        classification = clean_response_from_llm(response).lower().strip()
        
        # Ensure we get a valid classification
        if classification not in ["greeting", "product"]:
            # Default to product if unclear
            if any(term in context.user_message.lower() for term in ["price", "cost", "buy", "purchase", "product", "item"]):
                classification = "product"
            else:
                classification = "greeting"
        
        context.classification = classification
        logger.info(f"Message classified as: {classification}")
        return context