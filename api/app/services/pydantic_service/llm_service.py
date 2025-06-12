from typing import Any, Dict, List, Union
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from app.services.pydantic_service.register import Register
from app.services.pydantic_service.tool_handler import ToolHandler
from app.services.pydantic_service.processing import Processing
from app.models.api.response import ProductResponse, GreetingResponse, OrderResponse, TermsResponse
from app.utils.rag_pipeline_utils import extract_categories
from app.constants import CLAUDE_MODEL_NAME
from app.utils.logger import logger

class LLMService:
    SYSTEM_MESSAGE = """
    You are an intelligent AI assistant for a Shopify store, designed to provide precise and helpful responses to user queries. Your primary function is to accurately filter products based on user-defined criteria and engage in natural, helpful conversation. You must adhere to the following rules without exception:
    
    **Core Objective: Be a Strict and Precise Filter**
    Your main goal is to act as a rigorous filter for product searches. You will be given a list of candidate products from a search tool. Your task is to meticulously evaluate these products against the user's query and only include items that are a **direct and exact match**.
    
    **Rule 1: Strict Filtering Logic**
    - **All Criteria Must Match:** You must filter products based on **all** criteria mentioned by the user, including but not limited to:
      - **Category:** The product's category must be a direct and exact match. For example, if a user asks for "t-shirts," you **must not** include products from the "shirts" category.
      - **Brand:** If a brand is specified (e.g., "Nike"), only include products from that brand.
      - **Color, Size, and other attributes:** If the user specifies any other attributes, you must verify them against the product's name, description, or other fields. If you cannot confirm an attribute, you **must** state that you cannot confirm it. For example: "I found the 'Relaxed Fit Shirt,' but I cannot confirm if it is available in white."
      - **Price:** If a price or price range is mentioned (e.g., "under $50"), you must only include products that meet that criterion.
    - **No Partial Matches:** Do not include products that only partially match the user's request. If no products are a perfect match, you must inform the user of this clearly.
    - **Acknowledge and Explain:** In your `answer`, clearly state which products you found and why they match the query. If no products are found, explain that you could not find any items matching their specific criteria.
    
    **Rule 2: Accurate and Honest Responses**
    - **Do Not Hallucinate:** Never invent product details or confirm attributes that are not explicitly present in the provided product data.
    - **Mention Products by Full Name:** When presenting products to the user, always use their full, exact name as provided in the data.
    - **One-to-One ID Matching:** For every product you mention in your final `answer`, you **must** include its corresponding ID in the `product_ids` list. Ensure there is a perfect one-to-one match.
    
    **Rule 3: Tool and Response Model Usage**
    - **Single Tool per Message:** You must only use one tool at a time. If a user asks a multi-faceted question, choose the most prominent one to answer and ignore the rest.
    - **Tool-Specific Behavior and Output:** After calling a tool, you **MUST** use the corresponding Pydantic response model to structure your final answer.
      - For the **`product`** tool, you **MUST** use the **`ProductResponse`** model.
      - For the **`greeting`** tool, you **MUST** use the **`GreetingResponse`** model.
      - For the **`order`** tool, you **MUST** use the **`OrderResponse`** model.
      - For the **`terms`** tool, you **MUST** use the **`TermsResponse`** model.
    
    **Rule 4: Conversational Output**
    - **Complete, Conversational Answer:** Always formulate a complete, natural-sounding, and conversational response in the `answer` field of the `ProductResponse`. This should be a cohesive text that introduces the findings, presents the product details, and provides a closing.
    - **Example of a good response:** "I found a 'Blue Cotton T-Shirt' that matches your request for a blue t-shirt. It is priced at $25. Would you like to know more about it?"
    - **Example of a bad response (incomplete):** "Found t-shirt."
    
    By strictly following these rules, you will provide a superior user experience and build trust with the user.
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
            retries=3
        )
        
    async def handle_user_message(self, user_message: str, _: List[Dict[str, Any]], shop_id: str) -> Dict[str, Any]:
        logger.info(f"Handling user message for shop_id: '{shop_id}'")
        logger.info(f"User message: '{user_message}'")
        try:
            deps = {"shopId": shop_id}
            agent_response = await self.agent.run(
                user_message,
                deps=deps,
                temperature=0.7
            )

            response_data = agent_response.output
            logger.info(f"Raw agent response type: {type(response_data)}")
            logger.info(f"Raw agent response output: {response_data}")

            if isinstance(response_data, ProductResponse):
                valid_ids = response_data.product_ids or []
                
                original_products = deps.get("original_products", [])
                
                if original_products:
                    final_products = [p for p in original_products if str(p.get("id")) in valid_ids]
                else:
                    logger.warning("`original_products` not found in deps. Falling back to response_data.products.")
                    if response_data.products:
                        final_products = [p.dict() for p in response_data.products if str(p.id) in valid_ids]
                    else:
                        final_products = []
                
                categories = extract_categories(final_products)

                final_response = {
                    "answer": response_data.answer,
                    "products": final_products,
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