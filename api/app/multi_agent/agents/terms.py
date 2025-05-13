import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.services.embeddings_service import EmbeddingService
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import TermsResponse
from app.utils.logger import logger

class TermsAgent(Agent):
    """Handles terms, policies, and related queries"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "terms_prompt.json"

        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['terms_agent_prompt']
    
    async def process(self, context: AgentContext) -> AgentContext:
        try:
            feedback_instruction = ""
            previous_response = ""

            if context.feedback_history:
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

            if context.attempts == 0:
                user_message_embeddings = EmbeddingService.create_embeddings(context.user_message)

                query_response = await EmbeddingService.get_embeddings(
                    vector=user_message_embeddings,
                    namespace=self.prompt_config['rag_settings']['namespace'].format(namespace=context.namespace),
                    agent_type="TermsAgent"
                )

                context_texts = []
                for vec in query_response:
                    text = None
                    if isinstance(vec.metadata, dict):
                        text = vec.metadata.get("text")
                    else:
                        text = getattr(vec.metadata, "text", None)

                    if text:
                        context_texts.append(text)

            history_context = self._build_history_context(context)

            system_message = self.prompt_config['base_system_message'].format(history=history_context)
            if feedback_instruction:
                system_message += f"\n\n{feedback_instruction}\n\n{previous_response}"

            user_message = "\n\n".join([
                section.format(
                    user_message=context.user_message,
                    context_data="\n".join(context_texts) if context_texts else self.prompt_config['user_message_template']['default_values']['context_data']
                )
                for section in self.prompt_config['user_message_template']['sections']
            ])

            result = await DeepseekAIClient.generate(
                model_class=TermsResponse,
                user_message=user_message,
                system_message=system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens']
            )

            response_text = result.response

            context.response = response_text

            context.response, confidence_score = self._extract_confidence_score(context.response)
            context.confidence_score = confidence_score
            context.metadata["confidence_score"] = confidence_score

            if self.prompt_config['logging']['log_response_length']:
                logger.info(f"TermsAgent generated response of {len(context.response)} chars")
            if self.prompt_config['logging']['log_retry_attempts'] and context.attempts > 0:
                logger.info(f"TermsAgent RETRY #{context.attempts} generated improved response")
            
            return context

        except Exception as e:
            logger.error(f"Error in TermsAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Terms agent error: {str(e)}"
            context.confidence_score = 0.0
            context.response = self.prompt_config['response_structure']['fallback_response']
            return context

    def _build_history_context(self, context: AgentContext) -> str:
        """Format conversation history focusing on policy-related exchanges"""
        if not context.conversation_history:
            return "No previous conversation about policies or terms."
        
        policy_relevant = []
        for msg in context.conversation_history:
            if any(term in msg.get("user", "").lower() 
                   for term in ["policy", "terms", "privacy", "legal", "refund", "return"]):
                if msg.get("user"):
                    policy_relevant.append(f"User: {msg['user']}")
                if msg.get("agent"):
                    policy_relevant.append(f"Assistant: {msg['agent']}")

        return "\n".join(policy_relevant[-6:]) if policy_relevant else "No relevant policy history"

    def _extract_confidence_score(self, response_text: str) -> float:
        """Extract confidence score from the response text"""
        try:
            import re
            confidence_pattern = r'<confidence>(0\.\d+)</confidence>'
            match = re.search(confidence_pattern, response_text)

            if match:
                confidence_score = float(match.group(1))
                response_text_cleaned = re.sub(confidence_pattern, '', response_text).strip()
                return response_text_cleaned, confidence_score
            else:
                return response_text, 0.7
        except Exception as e:
            logger.error(f"Error extracting confidence score: {str(e)}")
            return response_text, 0.7