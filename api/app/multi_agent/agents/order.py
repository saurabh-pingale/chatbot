import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import OrderResponse
from app.dbhandlers.store_admin_handler import StoreAdminHandler
from app.utils.logger import logger

class OrderAgent(Agent):
    """Handles all order-related queries including shipping, returns, and order status"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "order_prompt.json"

        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['order_agent_prompt']
    
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

            history_context = self._build_history_context(context)

            store_handler = StoreAdminHandler()
            store_contact = await store_handler.get_support_contact(context.namespace)

            support_email = store_contact.get("support_email", "email not available")
            support_phone = store_contact.get("support_phone", "phone number not available")

            system_message = self.prompt_config['base_system_message'].format(history=history_context)

            support_contact_message = self.prompt_config['support_contact_message'].format(
                support_email=support_email,
                support_phone=support_phone
            )

            system_message += f"\n\n{support_contact_message}"

            if feedback_instruction:
                system_message += f"\n\n{feedback_instruction}\n\n{previous_response}"

            user_message = "\n\n".join([
                section.format(
                    user_message=context.user_message,
                    namespace=context.namespace
                )
                for section in self.prompt_config['user_message_template']['sections']
            ])

            result = await DeepseekAIClient.generate(
                model_class=OrderResponse,
                user_message=user_message,
                system_message=system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens']
            )

            response_text = result.response_text
            context.response = response_text

            context.response, confidence_score = self._extract_confidence_score(context.response)
            context.confidence_score = confidence_score
            context.metadata["confidence_score"] = confidence_score
            
            logger.info(f"OrderAgent processed message: {context.user_message}")
            logger.info(f"Generated response: {context.response}")
            logger.info(f"Confidence score: {confidence_score}")

            if self.prompt_config['logging']['log_response_length']:
                logger.info(f"OrderAgent generated response of {len(context.response)} chars")
            if self.prompt_config['logging']['log_retry_attempts'] and context.attempts > 0:
                logger.info(f"OrderAgent RETRY #{context.attempts} generated improved response")
            
            return context

        except Exception as e:
            logger.error(f"Error in OrderAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Order agent error: {str(e)}"
            context.confidence_score = 0.0
            
            context.response = f"{self.prompt_config['fallback_responses']['general_error']} {support_contact_message}"
                
            return context

    def _build_history_context(self, context: AgentContext) -> str:
        """Format conversation history focusing on order-related exchanges"""
        if not context.conversation_history:
            return "No previous conversation about orders"
        
        order_relevant = []
        for msg in context.conversation_history:
            if any(term in msg.get("user", "").lower() 
                  for term in ["order", "shipping", "delivery", "return", "track", "cancel", "refund"]):
                if msg.get("user"):
                    order_relevant.append(f"User: {msg['user']}")
                if msg.get("agent"):
                    order_relevant.append(f"Assistant: {msg['agent']}")
        
        return "\n".join(order_relevant[-6:]) if order_relevant else "No relevant order history"

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