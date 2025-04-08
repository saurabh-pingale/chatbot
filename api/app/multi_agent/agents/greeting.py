from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import clean_response_from_llm
from app.utils.logger import logger

class GreetingAgent(Agent):
    """Handles greeting messages and general conversation"""
    
    async def process(self, context: AgentContext) -> AgentContext:
        # Extract categories if available
        categories_str = ""
        if context.categories and len(context.categories) > 0:
            category_names = [cat["name"] for cat in context.categories if cat["name"]]
            categories_str = ", ".join(category_names[:3])  # Limit to 3 categories

        # Check if we have feedback from previous attempts
        feedback_instruction = ""
        previous_response = ""

        if context.feedback_history:
            # Get the most recent feedback
            recent_feedback = next(
                (fb for fb in reversed(context.feedback_history) 
                 if fb["agent"] == "EvaluatorAgent"),
                None
            )
            
            if recent_feedback:
                feedback_instruction = f"""
                Previous response was rated {recent_feedback['quality_score']}/10.
                Feedback: {recent_feedback['feedback']}
                
                IMPORTANT: Use this feedback to improve your response. Make specific changes 
                to address the issues mentioned in the feedback.
                """
                previous_response = f"Previous response: {context.response}\n\n"
        if context.attempts > 0:
            prompt = f"""
            You are a friendly shopping assistant. Your previous greeting response needs improvement.
            
            {feedback_instruction}
            
            User message: "{context.user_message}"
            {previous_response}
            
            Create an improved response that is:
            - Brief (1-2 sentences)
            - Welcoming
            - Prompt the user to ask about products
            {f'- Mention these example categories: {categories_str}' if categories_str else ''}
            """
        else:
            prompt = f"""
            You are a friendly shopping assistant. Respond to this greeting in a warm, 
            welcoming way and encourage the user to ask about products.

            Your response must be:
            - Brief (1-2 sentences)
            - Welcoming
            - Prompt the user to ask about products
            {f'- Mention these example categories: {categories_str}' if categories_str else ''}

            {feedback_instruction}

            User message: "{context.user_message}"
            """
        
        response = await generate_text_from_huggingface(prompt)
        context.response = clean_response_from_llm(response)

        if context.attempts > 0:
            logger.info(f"GreetingAgent RETRY #{context.attempts} generated improved response")

        return context