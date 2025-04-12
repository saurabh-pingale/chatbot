from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import clean_response_from_llm

class FallbackAgent(Agent):
    """Provides fallback responses when other agents fail"""
    
    async def process(self, context: AgentContext) -> AgentContext:
        # If we already have a response but it was low quality, try to improve it
        if context.response and context.classification:
            prompt = f"""
            Improve this response to better address the user's question.
            Make it more helpful, accurate, and concise.
            
            User question: "{context.user_message}"
            Previous response: "{context.response}"
            
            Improved response:
            """
            
            try:
                response = await generate_text_from_huggingface(prompt)
                context.response = clean_response_from_llm(response)
            except:
                # Keep the original response if improvement fails
                pass
        else:
            # Generic fallback if we have no response
            context.response = (
                "I'm sorry, I'm having trouble understanding your request. "
                "Could you please rephrase your question? I can help with product information, "
                "pricing, or general inquiries about our store."
            )
        
        return context