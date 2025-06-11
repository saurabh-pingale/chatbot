from typing import Any, Dict, List, Union
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from app.services.pydantic_service.register import Register
from app.services.pydantic_service.tool_handler import ToolHandler
from app.services.pydantic_service.processing import Processing
from app.models.api.response import ProductResponse, GreetingResponse, OrderResponse, TermsResponse
from app.constants import CLAUDE_MODEL_NAME
from app.utils.logger import logger
from app.utils.rag_pipeline_utils import extract_categories
from app.utils.claude_utils import (
    extract_normalized_response_text
)

ResponseType = Union[ProductResponse, GreetingResponse, OrderResponse, TermsResponse]

class LLMService:
    SYSTEM_MESSAGE = """
    You are a friendly and helpful AI assistant for a Shopify store. Your primary goal is to assist users with their questions about products, orders, and store policies.
    Always adopt a friendly, helpful, and slightly enthusiastic tone. Make the user feel like you're their personal shopper.

    You must use the tools provided to you to answer user questions. When using the 'product' tool, follow these rules strictly:
    1. The tool may return a broad list of products. Your primary job is to be a **strict filter**.
    2. You **must only** include products in your response that strictly match the user's query.
        - If a user asks for 'shirts', you **must not** include 'T-shirts' or 'Trousers'.
        - If a user asks for a specific color like 'black', you **must not** include products of other colors.
    3. After filtering, if no products remain, you **must** state that you could not find any matching products. For example: "I couldn't find any 'black shirts' in our inventory."
    4. If you have no exact matches, you can then suggest alternatives in the 'suggestions' field, but you must clearly label them as alternatives. For example: "However, we do have some great T-shirts in black that you might like."
    5. When presenting the products you found, you **must** clearly mention each product’s full name in your natural response text. This is required. Do not just list them in a separate product field.
        - For example: "You might love the **Formal Red Textured Shirt - Brat**, or the **Crimson Red Classic Shirt**."

    - For questions about orders or customer support, use the 'order' tool.
    - For questions about store policies like returns, use the 'terms' tool.
    - For simple greetings, use the 'greeting' tool.

    After the tool returns information, use it to formulate a natural, conversational response within the appropriate response model.
    If you do not have the information to answer a question, it is always better to say so than to make something up.

    In your response, include a hidden field product_ids (as metadata) which contains only the IDs of the products that strictly match the user's query. 
    Do not include T-Shirts if the user asked for Shirts. Only these IDs will be shown to the user.

    When returning structured output:
    - You MUST provide `products`, `product_ids`, and `categories` as native data structures — NOT as strings. For example:
        - `products` must be a list of product objects.
        - `product_ids` must be a list of string IDs.
        - `categories` must be a list of strings.
    - Do NOT wrap any structured fields in quotes or stringify the entire JSON.
    - The response should strictly adhere to the ProductResponse schema.
    """

    def __init__(self):
        self.tool_handler = ToolHandler()
        self.register = Register(self.tool_handler)
        self.processing = Processing()

        registered_tools = self.register.register_all_tools()

        self.agent = Agent(
            model=AnthropicModel(model_name=CLAUDE_MODEL_NAME),
            system_prompt=self.SYSTEM_MESSAGE,
            tools=registered_tools,
            deps_type=dict,
            output_type=ResponseType,
            retries=3 
        )
        
    async def handle_user_message(self, user_message: str, _: List[Dict[str, Any]], shop_id: str) -> Dict[str, Any]:
        logger.info(f"Handling user message for shop_id: '{shop_id}'")
        logger.info(f"User message: '{user_message}'")
        try:
            agent_response = await self.agent.run(
                user_message,
                deps={"shopId": shop_id},
                temperature=0.7
            )

            response_data = agent_response.output
            logger.info(f"Raw agent response type: {type(response_data)}")
            logger.info(f"Raw agent response output: {response_data}")

            if isinstance(response_data, ProductResponse):
                answer = extract_normalized_response_text(response_data)
                all_products = response_data.products or []
                valid_ids = response_data.product_ids or []
                
                product_dicts = [p.model_dump() for p in all_products if p.id in valid_ids]
                categories = extract_categories(product_dicts)

                final_response = {
                    "answer": answer,
                    "products": product_dicts,
                    "categories": categories,
                    "success": True
                }
                logger.info(f"Final processed response: {final_response}")
                return final_response
            elif isinstance(response_data, (GreetingResponse, OrderResponse, TermsResponse)):
                 processed_response = self.processing.process_response(response_data)
                 logger.info(f"Final processed response: {processed_response}")
                 return processed_response
            else:
                final_response = {"answer": str(response_data), "products": [], "categories": [], "success": True}
                logger.info(f"Final fallback response: {final_response}")
                return final_response

        except Exception as e:
            logger.error(f"Critical error in handle_user_message: {e}", exc_info=True)
            return {
                "answer": "I'm having some trouble right now. Please try again in a moment.",
                "products": [],
                "categories": [],
                "success": False,
                "error": str(e)
            }