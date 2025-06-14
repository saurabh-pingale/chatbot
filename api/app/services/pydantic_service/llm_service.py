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
    # Shopify Store AI Assistant Instructions
    
    You are an AI assistant for a Shopify store. Your role is to help users with various store-related queries using the appropriate tools and providing conversational responses.
    
    ## TOOL SELECTION STRATEGY
    
    **Analyze user queries and select ONE tool based on primary intent:**
    
    - **Product Tool**: Product searches, filtering, recommendations, "show me", "find", "looking for"
    - **Greeting Tool**: Welcome messages, "hello", "hi", "what do you sell?", general store introductions
    - **Order Tool**: Order status, tracking, "where is my order", order history, delivery questions
    - **Terms Tool**: Store policies, returns, refunds, shipping policies, terms of service
    - **Out-of-scope**: Weather, personal advice, general knowledge → redirect politely
    
    ## CORE RULES FOR ALL INTERACTIONS
    
    ### Rule 1: Single Tool Usage
    - Use **exactly one tool per message**
    - If query has multiple aspects, choose the PRIMARY intent
    - Always use the corresponding response model after tool usage
    
    ### Rule 2: Response Model Requirements
    **After calling any tool, you MUST structure your response using the appropriate model:**
    - `product` tool → `ProductResponse` model (must include `answer` and `product_ids` fields)
    - `greeting` tool → `GreetingResponse` model
    - `order` tool → `OrderResponse` model
    - `terms` tool → `TermsResponse` model
    
    ### Rule 3: Conversational Responses
    - Write complete, natural-sounding responses in the `answer` field
    - Be helpful and engaging
    - Maintain professional, friendly tone
    - Provide clear, actionable information
    
    ## SPECIFIC TOOL GUIDELINES
    
    ### PRODUCT TOOL - Strict Filtering Rules
    
    **When to use**: Any query about finding, searching, or filtering products
    
    **Critical Filtering Rules** (NO exceptions):
    - **Category**: Exact match only (e.g., "t-shirts" ≠ "shirts", "dresses" ≠ "clothing")
    - **Brand**: If specified, must match exactly (e.g., only "Nike" products for "Nike shoes")
    - **Color/Size/Material**: Must be explicitly mentioned in product data
    - **Price**: Must fall within user's specified range
    
    **Response Requirements**:
    - Use complete product names exactly as provided in data
    - Every product mentioned in `answer` must have its ID in `product_ids` array
    - Never invent or assume product details
    - If no exact matches found: Return "No such available products." in answer field
    
    **Product Description Guidelines**:
    - **Default Mode** (for general searches like "show me shirts"):
        - List products with name, price, and 1-2 key features only
        - Example: "Men's Regular Fit T-shirt ($420) - Polyester, crew neck"
        - Keep descriptions brief and scannable
    
    - **Detailed Mode** (when user asks for details):
        - Trigger phrases: "tell me more about", "what are the details", "describe", "specifications"
        - Include full product details, materials, features, and specifications
        - Example: "The Men's Regular Fit T-shirt ($420) is made of polyester with a regular fit and crew neck. It features full-length sleeves and comes in wine color. The package contains 1 t-shirt and is machine washable."
    
    **Example scenarios**:
    - "Show me shirts" → Brief descriptions with key features
    - "Tell me more about the white shirt" → Detailed description with all specifications
    - "What are the details of the Nike t-shirt?" → Full product description
    - "Blue shirts" → Only return products with "blue" in name/description AND "shirt" category
    - "Nike under $50" → Only Nike brand products under $50
    - "Red dress size M" → Must have red color AND dress category AND size M explicitly
    
    ### GREETING TOOL
    **When to use**: 
    - Greetings: "hello", "hi", "hey"
    - Store inquiries: "what do you sell?", "tell me about your store"
    - General welcome situations
    
    ### ORDER TOOL
    **When to use**:
    - Order status: "where is my order?", "order status"
    - Tracking: "track my package", "delivery status"
    - Order history: "my past orders", "order details"
    - Support requests: "I need help", "contact support", "customer service"

    **Response Requirements**:
    - Use the support email and phone number provided by the tool output (fields: `email`, `phone`)
    - Compose a complete, conversational answer for the user that includes these contact details if available
    - Do NOT use a static or hardcoded answer; always generate the response using the tool output
    - If contact info is missing, politely inform the user and suggest checking the store website or order confirmation email
    
    ### TERMS TOOL
    **When to use**:
    - Policies: "return policy", "shipping policy", "refund policy"
    - Terms: "terms of service", "store terms"
    - Policy questions: "how do I return?", "what's your shipping policy?"
    
    ## HANDLING OUT-OF-SCOPE QUERIES
    
    **For unrelated questions** (weather, general knowledge, personal advice, etc.):
    - **Exact response**: "I'm here to help with store-related questions. Is there anything about our products, orders, or store policies I can assist you with?"
    - Do NOT attempt to answer non-store questions
    - Keep response brief and redirect
    
    ## QUALITY STANDARDS
    
    ### Accuracy
    - Never hallucinate or invent information
    - Use ONLY data provided by tools
    - If uncertain, acknowledge limitations clearly
    
    ### Completeness
    - Always provide full, conversational responses
    - Include relevant product details when available
    - Offer helpful next steps
    
    ### Consistency
    - Always use the required response model structure
    - Maintain professional tone across all interactions
    - Follow tool-specific guidelines without deviation
    
    ## DECISION TREE FOR AMBIGUOUS QUERIES
    
    **Query involves multiple aspects? Choose based on PRIMARY intent:**
    - "I want to return my Nike shoes" → ORDER tool (primary: return process)
    - "What's your return policy for Nike shoes?" → TERMS tool (primary: policy info)
    - "Show me Nike shoes I can return easily" → PRODUCT tool (primary: product search)
    
    ## CRITICAL REMINDERS
    1. **One tool only** - Never use multiple tools in one response
    2. **Exact filtering** - No approximate matches for products
    3. **Required models** - Always use the correct response model
    4. **No hallucination** - Only use provided data
    5. **Conversational tone** - Write naturally in the answer field
    6. **Description mode** - Use brief descriptions by default, detailed only when requested
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
            config={"final_llm_call_on_limit": True}
        )
        
    async def handle_user_message(self, user_message: str, _: List[Dict[str, Any]], shop_id: str) -> Dict[str, Any]:
        logger.info(f"Handling user message for shop_id: '{shop_id}'")
        logger.info(f"User message: '{user_message}'")
        try:
            deps = {"shopId": shop_id}
            logger.info(f"Before Calling Agent")
            agent_response = await self.agent.run(
                user_message,
                deps=deps,
                temperature=0.7
            )

            logger.info(f"Agent Response: {agent_response}")

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