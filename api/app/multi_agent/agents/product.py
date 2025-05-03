import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.services.embeddings_service import EmbeddingService
from app.utils.rag_pipeline_utils import (
    extract_products_from_response,
    format_context_texts,
    extract_categories,
    extract_metadata_from_message
)
from app.multi_agent.pydantic_ai_client import DeepseekAIClient
from app.models.api.agent_router import ProductResponse
from app.utils.logger import logger

class ProductAgent(Agent):
    """Handles product-related queries"""
    def __init__(self):
        prompt_path = Path(__file__).parent.parent / "prompt" / "product_prompt.json"

        with open(prompt_path) as f:
            self.prompt_config = json.load(f)['product_agent_prompt']
    
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

            if not context.products or context.attempts == 0:
                user_message_embeddings = EmbeddingService.create_embeddings(context.user_message)

                metadata_filters = extract_metadata_from_message(context.user_message)

                query_response = await EmbeddingService.get_embeddings(
                    vector=user_message_embeddings,
                    namespace=self.prompt_config['rag_settings']['namespace'].format(namespace=context.namespace),
                    metadata_filters=metadata_filters
                )

                products = extract_products_from_response(query_response)

                context_texts = format_context_texts(query_response)
           
                context.products = products 
                context.categories = extract_categories(products) if products else []

            else:
                context_texts = [p.get("description", "") for p in context.products if p.get("description")]

            product_data = []
            for p in context.products:
                product_data.append({
                    "id": p.get("id", ""), 
                    "name": p.get("title", "Unknown Product"),
                    "price": p.get("price", "N/A"),
                    "description": p.get("description", ""),
                    "category": p.get("category", "")
                })

            history_context = self._build_history_context(context)

            system_message = self.prompt_config['base_system_message'].format(history=history_context)
            if feedback_instruction:
                system_message += f"\n\n{feedback_instruction}\n\n{previous_response}"

            user_message = "\n\n".join([
                section.format(
                    user_message=context.user_message,
                    products=str(product_data) if product_data else self.prompt_config['user_message_template']['default_values']['products'],
                    categories=str(context.categories) if context.categories else self.prompt_config['user_message_template']['default_values']['categories']
                )
                for section in self.prompt_config['user_message_template']['sections']
            ])

            result = await DeepseekAIClient.generate(
                model_class=ProductResponse,
                user_message=user_message,
                system_message=system_message,
                temperature=self.prompt_config['parameters']['temperature'],
                max_tokens=self.prompt_config['parameters']['max_tokens']
            )
            logger.info(f"LLM Response: {result}")

            if hasattr(result, 'id'):
                logger.info(f"LLM Returned IDs: {result.id} (Type: {type(result.id)})")
            else:
                logger.info("No IDs returned in LLM response")

            requested_ids = set()
            if hasattr(result, 'id') and result.id:
                if isinstance(result.id, str):
                    if result.id.strip().startswith('[') and result.id.strip().endswith(']'):
                        try:
                            id_list = json.loads(result.id)
                            requested_ids.update(str(id_).strip() for id_ in id_list)
                        except json.JSONDecodeError:
                            requested_ids.add(str(result.id).strip())
                    else:
                        requested_ids.add(str(result.id).strip())
                elif isinstance(result.id, list):
                    requested_ids.update(str(id_).strip() for id_ in result.id)
                elif isinstance(result.id, int):
                    requested_ids.add(str(result.id).strip())

            if requested_ids:
                filtered_products = [
                    p for p in context.products
                    if str(p.get("id", "")).strip() in requested_ids
                ]

                logger.info(f"Products before filtering (Count: {len(context.products)}): {[p.get('id') for p in context.products]}")
                logger.info(f"Filtered products (Count: {len(filtered_products)}): {[p.get('id') for p in filtered_products]}")

                if filtered_products:
                    context.products = filtered_products
                    logger.info(f"Successfully filtered to {len(filtered_products)} products matching requested IDs")
                else:
                    logger.info("No products matched the requested IDs, maintaining original product list")
            else:
                logger.info("No product IDs specified in LLM response, maintaining original product list")
           
            response_text = result.introduction

            if result.products:
                response_text += f"\n\nHere are {len(result.products)} matching products:"
                for product in result.products:
                    response_text += f"\n{self.prompt_config['response_structure']['product_format'].format(name=product.name, price=product.price)}"

            logger.info(f"Response products: {result.products}")    

            if result.suggestions:
                response_text += "\n\n" if not result.products else ""
                response_text += result.suggestions

            if result.closing:
                response_text += f"\n\n{result.closing}"

            context.response = response_text

            context.response, confidence_score = self._extract_confidence_score(context.response)
            context.confidence_score = confidence_score
            context.metadata["confidence_score"] = confidence_score

            logger.info(f"ProductAgent processed message: {context.user_message}")
            logger.info(f"Generated response: {context.response}")
            logger.info(f"Confidence score: {confidence_score}")

            if self.prompt_config['logging']['log_response_length']:
                logger.info(f"ProductAgent generated response of {len(context.response)} chars")
            if self.prompt_config['logging']['log_retry_attempts'] and context.attempts > 0:
                logger.info(f"ProductAgent RETRY #{context.attempts} generated improved response")
            
            return context

        except Exception as e:
            logger.error(f"Error in ProductAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Product agent error: {str(e)}"
            context.confidence_score = 0.0
            
            if context.products:
                product_names = [p.get("name", "product") for p in context.products[:self.prompt_config['rag_settings']['max_product_display']]]
                context.response = self.prompt_config['response_structure']['fallback_responses']['with_products'].format(
                    product_names=", ".join(product_names)
                )
            else:
                context.response = self.prompt_config['response_structure']['fallback_responses']['no_products']
                
            return context

    def _build_history_context(self, context: AgentContext) -> str:
        """Format conversation history focusing on product-related exchanges"""
        if not context.conversation_history:
            return "No previous conversation about products"
        
        product_relevant = []
        for msg in context.conversation_history:
            if any(term in msg.get("user", "").lower() 
                  for term in ["product", "item", "buy", "price"]):
                if msg.get("user"):
                    product_relevant.append(f"User: {msg['user']}")
                if msg.get("agent"):
                    product_relevant.append(f"Assistant: {msg['agent']}")
        
        return "\n".join(product_relevant[-6:]) if product_relevant else "No relevant product history"

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