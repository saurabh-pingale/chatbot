from typing import Any, Dict, List, Union
from pydantic_ai import Agent
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.models.anthropic import AnthropicModel
import time

from app.services.pydantic_service.register import Register
from app.services.pydantic_service.tool_handler import ToolHandler
from app.services.pydantic_service.processing import Processing
from app.models.api.response import ProductResponse, GreetingResponse, OrderResponse, TermsResponse
from app.utils.rag_pipeline_utils import extract_categories
from app.constants import CLAUDE_MODEL_NAME
from app.utils.logger import logger

class LLMService:
    SYSTEM_MESSAGE = """
    ## Shopify Store AI Assistant - Core Instructions
    You're a friendly Shopify assistant. Chat warmly with positive language only - never use "I'm afraid", "sorry", or "can't". Help users find products with precise, helpful responses
    **RESPONSE LENGTH RULE: Keep ALL responses under 50 words. Be direct and concise - no lengthy explanations or over-politeness.**

    ---
    ### Core Tools
    You have the following tools to answer user queries. Use them as needed. If a query has multiple parts, you should use multiple tools in parallel.
    | Tool      | Use for...                                     |
    |-----------|------------------------------------------------|
    | Product   | **ANY** query related to finding, filtering, or asking about product attributes (color, size, brand, fabric, etc.). |
    | Greeting  | Simple welcomes like "hello", "hi", "what can you do?", "how are you doing?", "hola". |
    | Order     | Questions about order status, tracking, or history. |
    | Terms     | Questions about policies (returns, shipping, and other policies like cookies etc.). |
    ---

    ## CRITICAL RULES FOR THE 'PRODUCT' TOOL

    When a user asks for products, you MUST follow this process EXACTLY. This is not a guideline; it is a mandatory procedure.
    **Step 1: Extract ALL Attributes for EACH Request**
    - For each individual request, identify all specified attributes.
    - The attributes can be: `category`, `color`, `size`, `brand`, `material` (fabric), `price`, and any other specific product feature mentioned.
    - **IMPORTANT**: You must perform an **EXACT, case-insensitive match** on the `category`. "Shirts" and "T-Shirts" are two COMPLETELY DIFFERENT categories.

    **Step 2: Let the Tool Handle Metadata Filtering**
    - The `Product` tool will automatically return products that match the user's request, based on metadata filtering.
    - You do **not** need to manually enforce attribute matching or filtering rules.

    **Step 3: Generate the Final Response (`ProductResponse`)**
    - `product_ids`: Collect the IDs of ALL returned products from ALL requests.
    - `answer`: This is the conversational part. You MUST be honest about what you found and what you didn't.
        - **Maximum 50 words per response. If exceeds then try to short it**
        - **If all requests were successful:** "Great choice! Here are your options:" or "Perfect! Here are the products:" 
        - **If partially successful:** "Found some options for you, but [briefly explain what's missing]."
        - *If no results:** "Let me help you find something else! What are you looking for?😊"
        - Never mention product details, descriptions, or specifications and avoid mentioning product titles as well because users already know what they want to search.

    **Step 4: No Products or Categories Found? Suggest Available Categories**
    - If no products or categories match the user's query, but `categories` is returned in the tool output:
        - Respond like: "As of now, we don't have that right now. But you might like these other popular options like: [category1], [category2], ..."
    - You must NEVER invent categories — only use what the tool returns.

    ---
    **CRITICAL: All responses must be under 50 words. Use friendly adjectives (awesome, perfect, great) to sound warm and engaging. No exceptions.**
    """


    def __init__(self):
        self.tool_handler = ToolHandler()
        self.register = Register(self.tool_handler)
        self.processing = Processing()

        registered_tools, response_models = self.register.register_all_tools()
        
        if len(response_models) > 1:
            ResponseType = Union[tuple(response_models)]
        elif response_models:
            ResponseType = response_models[0]
        else:
            ResponseType = str

        self.agent = Agent(
            model=AnthropicModel(model_name=CLAUDE_MODEL_NAME),
            system_prompt=self.SYSTEM_MESSAGE,
            tools=registered_tools,
            deps_type=dict,
            output_type=ResponseType,
            retries=3,
            config={"final_llm_call_on_limit": True},
            parallel_tool_calls=True
        )
        
    async def handle_user_message(self, user_message: str, _: List[Dict[str, Any]], shop_id: str) -> Dict[str, Any]:
        logger.info(f"Handling user message for shop_id: '{shop_id}'")
        logger.info(f"User message: '{user_message}'")
        try:
            all_found_products = [] 

            deps = {
                "shopId": shop_id,
                "product_cache": all_found_products
            }
            
            start = time.time()
            logger.info("Starting agent call")
            agent_response = await self.agent.run(
                user_message,
                deps=deps,
                temperature=0.7
            )
            logger.info(f"Agent call completed in {time.time() - start:.2f}s")
            logger.info(f"Agent Response: {agent_response}")

            response_outputs = agent_response.output
            logger.info(f"Type of Response Outputs: {type(response_outputs)}")
            logger.info(f"Response Outputs: {response_outputs}")
            
            if not isinstance(response_outputs, list):
                response_outputs = [response_outputs]

            final_answer_parts = []
            final_products = []
            final_categories = set()

            for response_data in response_outputs:
                logger.info(f"Processing response of type: {type(response_data)}")

                if isinstance(response_data, ProductResponse):
                    if response_data.answer:
                        final_answer_parts.append(response_data.answer)

                    valid_ids = response_data.product_ids or []

                    matched_products = []
                    if all_found_products:
                        matched_products.extend([
                            p for p in all_found_products if str(p.get("id")) in valid_ids
                        ])

                    if response_data.products:
                        matched_products.extend([
                            p.dict() for p in response_data.products if str(p.id) in valid_ids
                        ])

                    final_products.extend(matched_products)
                    product_categories = extract_categories(matched_products)
                    final_categories.update(product_categories)
                    
                    if not product_categories and response_data.available_categories:
                        logger.info(f"Using available_categories as fallback: {response_data.available_categories}")
                        final_categories.update(response_data.available_categories)

                elif isinstance(response_data, (GreetingResponse, OrderResponse, TermsResponse)):
                    processed = self.processing.process_response(response_data)
                    if processed.get("answer"):
                        final_answer_parts.append(processed["answer"])

                elif isinstance(response_data, str):
                     final_answer_parts.append(response_data)

            final_response = {
                "answer": "\n\n".join(final_answer_parts),
                "products": final_products,
                "categories": list(final_categories),
                "success": True
            }

            logger.info(f"Final aggregated response: {final_response}")
            return final_response            
        except UsageLimitExceeded as exc:
            logger.error(f"Usage Limit Exceeded: {exc}", exc_info=True)
            return {
                "answer": "As of now we couldn't able to process your query, give us some time our support agent will contact you.",
                "products": [],
                "categories": [],
                "success": False,
                "error": str(exc)
            } 

        except Exception as e:
            logger.error(f"Critical error in handle_user_message: {e}", exc_info=True)
            return {
                "answer": "I'm having some trouble right now. Please try again in a moment.",
                "products": [],
                "categories": [],
                "success": False,
                "error": str(e)
            }