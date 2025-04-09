import json
from pathlib import Path
from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.services.embeddings_service import EmbeddingService
from app.utils.rag_pipeline_utils import (
    extract_products_from_response,
    format_context_texts,
    filter_relevant_products,
    is_product_query,
    extract_categories
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
            # Handle feedback from previous attempts
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

            # Generate embeddings for the query (only if first attempt or we need fresh data)
            if not context.products or context.attempts == 0:
                # Generate embeddings for the query
                user_message_embeddings = await EmbeddingService.create_embeddings(context.user_message)

                # Query vector database
                query_response = await EmbeddingService.get_embeddings(
                    vector=user_message_embeddings, 
                    namespace=self.prompt_config['rag_settings']['namespace'].format(namespace=context.namespace)
                )

                # Extract products and format context
                products = extract_products_from_response(query_response)
                context_texts = format_context_texts(query_response)

                # Update product data in context (keep the product data if retry)
                if is_product_query(context.user_message, products):
                    context.products = filter_relevant_products(products, context.user_message)
                    context.categories = extract_categories(context.products)
                else:
                    # Even if not a direct product query, we'll keep some products in context
                    context.products = products[:self.prompt_config['rag_settings']['max_products_first_pass']]
                    context.categories = extract_categories(products) if products else []
            else:
                # Reuse existing product data for retries
                context_texts = [p.get("description", "") for p in context.products if p.get("description")]

            # Convert context products to JSON-serializable format for the prompt
            product_data = []
            for p in context.products:
                product_data.append({
                    "name": p.get("name", "Unknown Product"),
                    "price": p.get("price", "N/A"),
                    "description": p.get("description", "")
                })

            # Build system message
            system_message = self.prompt_config['base_system_message']
            if feedback_instruction:
                system_message += f"\n\n{feedback_instruction}\n\n{previous_response}"

            # Build user message
            user_message = "\n\n".join([
                section.format(
                    user_message=context.user_message,
                    products=str(product_data) if product_data else self.prompt_config['user_message_template']['default_values']['products'],
                    categories=(
                        [cat["name"] for cat in context.categories] 
                        if context.categories 
                        else self.prompt_config['user_message_template']['default_values']['categories']
                    )
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

            # Convert structured response to text
            response_text = result.introduction

            if result.products:
                response_text += f"\n\nHere are {len(result.products)} matching products:"
                for product in result.products:
                    response_text += f"\n{self.prompt_config['response_structure']['product_format'].format(name=product.name, price=product.price)}"

            if result.suggestions:
                response_text += "\n\n" if not result.products else ""
                response_text += result.suggestions

            if result.closing:
                response_text += f"\n\n{result.closing}"

            context.response = response_text

            if self.prompt_config['logging']['log_response_length']:
                logger.info(f"ProductAgent generated response of {len(context.response)} chars")
            if self.prompt_config['logging']['log_retry_attempts'] and context.attempts > 0:
                logger.info(f"ProductAgent RETRY #{context.attempts} generated improved response")
            
            return context

        except Exception as e:
            logger.error(f"Error in ProductAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Product agent error: {str(e)}"
            
            # Fallback response
            if context.products:
                product_names = [p.get("name", "product") for p in context.products[:self.prompt_config['rag_settings']['max_product_display']]]
                context.response = self.prompt_config['response_structure']['fallback_responses']['with_products'].format(
                    product_names=", ".join(product_names)
                )
            else:
                context.response = self.prompt_config['response_structure']['fallback_responses']['no_products']
                
            return context