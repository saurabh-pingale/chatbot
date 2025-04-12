from app.multi_agent.agents.base import Agent
from app.multi_agent.context.agent_context import AgentContext
from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler
from app.external_service.generate_embeddings import generate_embeddings
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import (
    clean_response_from_llm,
    extract_products_from_response,
    format_context_texts,
    filter_relevant_products,
    is_product_query,
    extract_categories
)
from app.utils.logger import logger

class ProductAgent(Agent):
    """Handles product-related queries"""
    
    def __init__(self):
        self.rag_pipeline_handler = RagPipelineHandler()
    
    async def process(self, context: AgentContext) -> AgentContext:
        try:
            # Check if we have feedback from previous attempts
            feedback_instruction = ""
            previous_response = ""

            if context.feedback_history:
                # Get the most recent feedback for this agent
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

            # Generate embeddings for the query (only if first attempt or we need fresh data)
            if not context.products or context.attempts == 0:
                # Generate embeddings for the query
                user_message_embeddings = await generate_embeddings(context.user_message)

                # Query vector database
                query_response = await self.rag_pipeline_handler.query_embeddings(
                    vector=user_message_embeddings, 
                    namespace=context.namespace
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
                    context.products = products[:5] if products else []
                    context.categories = extract_categories(products) if products else []
            else:
                # Reuse existing product data for retries
                context_texts = [p.get("description", "") for p in context.products if p.get("description")]

            # Create different prompts based on whether this is a retry
            if context.attempts > 0:
                prompt = f"""
                You are a shopping assistant. Your previous response to the product query needs improvement.
                
                {feedback_instruction}
                
                User query: "{context.user_message}"
                {previous_response}
                
                Product information:
                {format_context_texts(context.products)}
                
                Create an improved response that:
                1. Directly addresses the user's query about products
                2. Provides accurate information based on the product data
                3. Is concise but complete
                4. Recommends specific products when appropriate
                """
            else:        
                # Create prompt and get LLM response
                prompt = f"""
                You are a specialized product search assistant for a Shopify store. Your sole purpose is to help users find and learn about products based on their queries.

                AVAILABLE PRODUCT DATA: {context_texts or 'NO CATALOG PROVIDED'}

                RESPONSE GUIDELINES:

                1. For product queries:
                   - List ONLY products that match the query from the provided catalog
                   - Format product listings consistently as:
                     "Here are [N] matching products:
                     • [Product Name] - [Price]
                     • [Product Name] - [Price]
                     Let me know if you'd like details on any!"
                   - Include EXACTLY matching product names and prices from the catalog
                   - Format prices exactly as shown in the catalog (e.g., ₹XXX.XX)
                   - Limit to maximum 5 products
                   - NEVER invent products or details not in the catalog

                2. If no matching products found:
                   - Response format: "I couldn't find matches. Try these categories: [Category1], [Category2]"
                   - Suggest only categories that exist in the catalog
                   - Do not apologize excessively

                3. For generic product inquiries:
                   - Suggest 2-3 popular product categories from the catalog
                   - Format: "We have a wide range of products. Are you looking for [Category1], [Category2], or [Category3]?"

                4. Response must ALWAYS be:
                   - Concise (3-5 bullet points max for products)
                   - Free of explanations of your reasoning
                   - Without self-references ("I", "we")
                   - Free of unnecessary symbols except price indicators

                5. If catalog data is empty:
                   - Respond ONLY with: "No product catalog available"

                6. For off-topic queries:
                   - Response: "I apologize, I don't have information on this..."
                   - Do not elaborate further

                User: {context.user_message}
                Assistant:
                """

             # Add feedback instruction if available
            if feedback_instruction and context.attempts == 0:
                prompt = f"{feedback_instruction}\n\n{prompt}"

            llm_response = await generate_text_from_huggingface(prompt)
            cleaned_response = clean_response_from_llm(llm_response)
            
            # Update context with products and response
            context.response = cleaned_response
            
            # Log if this is a retry
            if context.attempts > 0:
                logger.info(f"ProductAgent RETRY #{context.attempts} generated improved response")
            
            return context
            
        except Exception as e:
            logger.error(f"Error in ProductAgent: {str(e)}", exc_info=True)
            context.metadata["error"] = f"Product agent error: {str(e)}"
            return context