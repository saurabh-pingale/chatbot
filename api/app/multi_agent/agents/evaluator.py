import re
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import clean_response_from_llm
from app.utils.logger import logger

class EvaluatorAgent(Agent):
    """Evaluates the quality of responses"""
    
    async def process(self, context: AgentContext) -> AgentContext:
        if not context.response:
            context.quality_score = 0
            context.metadata["feedback"] = "No response was generated."
            return context
        
        prompt = f"""
        Evaluate the assistant's response to the user query and provide:
        1. A quality score from 0 to 10 based on these criteria:
           - Relevance to user's question
           - Accuracy of information
           - Conciseness and clarity
           - Completeness of answer
        
        2. Detailed feedback explaining:
           - What aspects of the response were good
           - What specific improvements are needed
           - How the response could better address the user's needs
        
        Format your response exactly like this:
        Score: [number between 0-10]
        Feedback: [Your detailed feedback explaining strengths and weaknesses]
        
        User query: "{context.user_message}"
        Assistant response: "{context.response}"
        """
        
        try:
            response = await generate_text_from_huggingface(prompt)
            cleaned_response = clean_response_from_llm(response)

            # Extract score and feedback
            score_match = re.search(r'Score:\s*([0-9]|10)', cleaned_response)
            feedback_match = re.search(r'Feedback:\s*(.*)', cleaned_response, re.DOTALL)
            
            if score_match:
                context.quality_score = float(score_match.group(1))
            else:
                # Default to moderate score if parsing fails
                context.quality_score = 5.0

            if feedback_match:
                feedback = feedback_match.group(1).strip()
                context.metadata["feedback"] = feedback
            else:
                context.metadata["feedback"] = "Unable to generate specific feedback."
                
            context.attempts += 1
            logger.info(f"Response quality score: {context.quality_score}")
            logger.info(f"Feedback: {context.metadata.get('feedback', 'None')}")
            
        except Exception as e:
            logger.error(f"Error in EvaluatorAgent: {str(e)}", exc_info=True)
            # Default to passing score on error
            context.quality_score = 6.0
            context.metadata["eval_error"] = str(e)
            context.metadata["feedback"] = "Evaluation error occurred."
            
        return context