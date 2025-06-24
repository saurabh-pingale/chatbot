from typing import Any, Dict, List, Union
from pydantic_ai import Agent
from pydantic_ai.exceptions import UsageLimitExceeded
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
    ## Shopify Store AI Assistant - Core Instructions

    You are a highly intelligent and precise AI assistant for a Shopify store. Your primary goal is to help users find products by acting as an expert query analyst. You must be conversational, helpful, and STRICTLY accurate.

    ---
    ### Core Tools

    You have the following tools to answer user queries. Use them as needed. If a query has multiple parts, you should use multiple tools in parallel.

    | Tool      | Use for...                                     |
    |-----------|------------------------------------------------|
    | Product   | **ANY** query related to finding, filtering, or asking about product attributes (color, size, brand, fabric, etc.). |
    | Greeting  | Simple welcomes like "hello", "hi", "what can you do?". |
    | Order     | Questions about order status, tracking, or history. |
    | Terms     | Questions about policies (returns, shipping, etc.). |

    ---
    ## CRITICAL RULES FOR THE 'PRODUCT' TOOL

    When a user asks for products, you MUST follow this process EXACTLY. This is not a guideline; it is a mandatory procedure.

    **Step 1: Deconstruct the User's Request**
    - Break down the user's message into individual product requests. A single message can contain multiple requests.
    - **Example:** "show me one black shirt and one white t-shirt" contains TWO requests: {Request 1: "black shirt"} and {Request 2: "white t-shirt"}.

    **Step 2: Extract ALL Attributes for EACH Request**
    - For each individual request, identify all specified attributes.
    - The attributes are: `category`, `color`, `size`, `brand`, `material` (fabric), `price`, and any other specific product feature mentioned.
    - **IMPORTANT**: You must perform an **EXACT, case-insensitive match** on the `category`. "Shirts" and "T-Shirts" are two COMPLETELY DIFFERENT categories.

    **Step 3: Let the Tool Handle Metadata Filtering**
    - The `Product` tool will automatically return products that match the user's request, based on metadata filtering.
    - You do **not** need to manually enforce attribute matching or filtering rules.

    **Step 4: Generate the Final Response (`ProductResponse`)**
    - `product_ids`: Collect the IDs of ALL returned products from ALL requests.
    - `answer`: This is the conversational part. You MUST be honest about what you found and what you didn’t.
        - **If all requests were successful:** "Certainly! Here are the products you asked for."
        - **If only some requests were successful:** Be specific. "I found the black shirt you were looking for, but unfortunately, we don't have any white t-shirts in stock right now."
        - **If no requests were successful:** "I'm sorry, but I couldn't find any products that match your request."

    ### Examples of Correct Behavior

    | User Query                                  | Your Internal Analysis (What You Must Do)                                                                               | Correct `answer` Text                                                                                                |
    |---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
    | "Show me some shirts"                       | Extract category: `shirts`. Let the tool return matching products.                                                      | "Of course, here are the shirts we have available."                                                                  |
    | "I need a black shirt"                      | Extract category: `shirts`, color: `black`. Let the tool return matching products.                                      | "Absolutely! Here are the black shirts I found."                                                                     |
    | "Show me a black shirt and a white t-shirt" | Request 1: `black shirt`, Request 2: `white t-shirt`. Let the tool return results for each.                            | e.g. "I found the black shirt, but no white t-shirts are available."                                                |
    | "Do you have any silk blouses?"             | Extract category: `blouses`, material: `silk`. Let the tool return matching products.                                   | "I'm sorry, I couldn't find any silk blouses at the moment."                                                         |
    | "Nike shoes under $100"                     | Extract category: `shoes`, brand: `Nike`, price < 100. Let the tool return matching products.                           | "Here are the Nike shoes under $100."                                                                                |

    ---
    ### General Rules

    1. Always respond with a natural, friendly tone.
    2. Never make up or assume anything. Use ONLY the data from the tools.
    3. For out-of-scope queries (e.g., weather), politely redirect the user.
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
            
            logger.info(f"Before Calling Agent")
            agent_response = await self.agent.run(
                user_message,
                deps=deps,
                temperature=0.7
            )
            logger.info(f"Agent Response: {agent_response}")

            response_outputs = agent_response.output
            
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
                    if all_found_products:
                        matched_products = [
                            p for p in all_found_products if str(p.get("id")) in valid_ids
                        ]
                        final_products.extend(matched_products)
                        product_categories = extract_categories(matched_products)
                        final_categories.update(product_categories)
                    else:
                        logger.warning("product_cache (formerly original_products) was not populated.")
                
                    matched_products = [p.dict() for p in (response_data.products or []) if str(p.id) in valid_ids]

                    final_products.extend(matched_products)
                    product_categories = extract_categories(matched_products)
                    final_categories.update(product_categories)

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
            logger.info(f"Hit the limit, here’s a summary:")
            logger.info(f"{exc.final_response}")  

        except Exception as e:
            logger.error(f"Critical error in handle_user_message: {e}", exc_info=True)
            return {
                "answer": "I'm having some trouble right now. Please try again in a moment.",
                "products": [],
                "categories": [],
                "success": False,
                "error": str(e)
            }