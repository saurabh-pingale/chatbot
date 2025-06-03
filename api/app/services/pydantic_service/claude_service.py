from typing import Optional, Any, Type, Callable
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.exceptions import UnexpectedModelBehavior

from app.services.pydantic_service.tool_handler import ToolHandler
from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.pydantic_service.tools.greeting_tool import GreetingTool
from app.services.pydantic_service.tools.product_tool import ProductTool 
from app.services.pydantic_service.tools.order_tool import OrderTool
from app.services.pydantic_service.tools.terms_tool import TermsTool
from app.constants import CLAUDE_MODEL_NAME
from app.utils.rag_pipeline_utils import extract_categories
from app.models.api.response import (
    Product,
    GreetingResponse,
    ProductResponse,
    OrderResponse,
    TermsResponse,
    BaseResponse
)
from app.utils.claude_utils import (
    extract_tool_data_from_agent_messages,
    create_enhanced_message_for_llm,
    get_llm_text_from_product_response,
    create_error_greeting_response,
    format_agent_response_to_dict,
    format_error_dict_for_client
)
from app.utils.logger import logger

class ClaudeService:
    """Main service handling Claude interactions with dynamic tool support"""

    GREETING_TOOL_NAME = "greeting"
    PRODUCT_TOOL_NAME = "product"
    ORDER_TOOL_NAME = "order"
    TERMS_TOOL_NAME = "terms"
    
    SYSTEM_MESSAGE = """
    You are a smart, friendly, and helpful AI assistant for a Shopify store. 
    You MUST use the appropriate tools for ALL user interactions. Never respond directly without using a tool.

    Available tools and when to use them:
    - **greeting**: Use for greetings, welcome messages, general hellos, or when users ask how you are
    - **product**: Use for product searches, product inquiries, browsing requests, or category questions
    - **order**: Use for order status, shipping questions, or customer support contact requests
    - **terms**: Use for policy questions, return policies, shipping terms, or store regulations

    IMPORTANT: Always select and use the most appropriate tool. Do not provide direct responses.
    
    Guidelines:
    - Never hallucinate product or policy information
    - Be concise, helpful, and structured in responses
    - For products, include IDs in brackets (e.g., Nike Air Max [id: 1234])
    """
    
    FINAL_SYSTEM_MESSAGE = """
    You are a smart, friendly, and helpful AI assistant for a Shopify store. You are capable of handling various customer support and product-related tasks using a set of specialized tools.
    Your goal is to generate a response that will be parsed into a structured Pydantic model based *strictly* on the provided "Tool Output".

    When a user asks for products (e.g., "show me red shirts"), the prior "product" tool will provide you with a list of potentially relevant items in the "Tool Output" section of the prompt.
    Your task is to:
    1. Analyze the "Tool Output" (which is a JSON list of products) very carefully.
    2. Select *only* the products from the "Tool Output" that *actually and accurately* BEST match the user's specific request (e.g., if they asked for "red shirts", only select items that are explicitly described as red AND are shirts in the "Tool Output").
    3. If no products in the "Tool Output" genuinely match the user's specific request, YOU MUST STATE THIS CLEARLY and not attempt to offer unrelated products as if they were a match. For example, if the user asks for "red shirts" and the "Tool Output" contains only blue shirts or red trousers, you should say something like, "I couldn't find any red shirts in the current selection, but I found some blue shirts and red trousers. Would you be interested in those, or should I try a different search?"
    4. If matching products *are* found in the "Tool Output", in your textual response (which will populate fields like 'introduction' or 'closing' in the Pydantic model), you MUST explicitly mention the full `name` (or `title`) and `price` of EACH product you are presenting from the "Tool Output". You should also include the product `id` in brackets after its name, like "Example Red Shirt [id: 123]".
    5. Construct an engaging and helpful message around these *genuinely selected* products, or explain clearly if no suitable products were found in the "Tool Output".

    - For **greeting**: Respond in a warm and friendly shopping assistant tone. Mention top categories (if available from tool output).
    - For **product inquiries**:
        - Critically evaluate the "Tool Output". Do NOT assume it perfectly matches the user query.
        - Filter these products to *strictly* match the user's specific query (e.g., color, type, features mentioned by the user) based *only* on the information in the "Tool Output".
        - If, after careful evaluation, products from the "Tool Output" meet the user's criteria: List their `name`, `price`, and `id` (e.g., "Product Name [id: 123]") in your textual response. Example: "Okay, I found some red shirts for you from the provided list! We have the 'Awesome Red Tee [id: 456]' for $25.00 and the 'Vibrant Red Polo [id: 789]' for $30.00."
        - If *no products* in the "Tool Output" are a good match for the specific request: Politely state this. You can then ask if the user wants to see the available items from the tool output anyway, or if they want to try a different search. Example: "I looked through the available products from the tool, but I couldn't find any [specific user request, e.g., 'red shirts'] in that list. I did find [other types of items in Tool Output, e.g., 'blue shirts and red pants']. Would you like to hear about those, or should I search for something else?"
        - You MUST NOT invent products or categories. You MUST NOT describe a product from the "Tool Output" as matching the user's query if it clearly does not (e.g., do not offer a blue shirt if the user asked for a red one, unless you explicitly state it's not red but is an alternative).
    - For **order support**: Answer user questions about order status, how to contact support (email or phone), or related logistics, based on information from the relevant tool.
    - For **terms or policies**: Use the knowledge from the store's terms context (from the tool) to answer questions related to shipping, return policies, or store regulations.

    Guidelines:
    - NEVER HALLUCINATE product details, colors, types, or policy information. Stick strictly to the "Tool Output".
    - If a user asks about an unavailable product/category (i.e., not in the "Tool Output" for the current query) or external marketplaces, politely clarify that you can only help with products listed in the provided "Tool Output" for this store.
    - Be concise, helpful, and structured in your responses.
    - Ensure your textual response (for the Pydantic model) contains enough detail (product names, prices, IDs for *selected and matching* products) for any subsequent filtering steps to work correctly, OR clearly states that no matching products were found in the provided tool data.
    """

    def __init__(self, test_mode=False, failure_rate=0.5):
        self.test_mode = test_mode
        self.failure_rate = failure_rate
        
        self.agent = Agent(
            model=AnthropicModel(model_name=CLAUDE_MODEL_NAME),
            system_prompt=self.SYSTEM_MESSAGE,
            retries=3
        )
        
        self.tool_handler = ToolHandler()
        self._register_tools()

    def _register_tools(self):
        """Register all available tools"""
        self._register_greeting_tool()
        self._register_product_tool()
        self._register_order_tool()
        self._register_terms_tool()

    def _register_greeting_tool(self):
        """Register greeting tool"""
        greeting_tool = GreetingTool()
        self._register_tool_instance(
            greeting_tool,
            response_model=GreetingResponse,
            processor=lambda response, output: setattr(
                response, 
                'category_mention', 
                f"Some popular categories: {', '.join(output['categories'])}"
            ) if output.get("categories") else None
        )

    def _register_product_tool(self):
        """Register product tool"""
        product_tool = ProductTool(self.test_mode, self.failure_rate)
        self._register_tool_instance(
            product_tool,
            response_model=ProductResponse,
            processor=self._process_product_output
        )

    def _register_order_tool(self):
        """Register order tool"""
        order_tool = OrderTool()
        self._register_tool_instance(
            order_tool,
            response_model=OrderResponse,
            processor=self._process_order_output
        )

    def _register_terms_tool(self):
        """Register terms tool"""
        terms_tool = TermsTool()
        self._register_tool_instance(
            terms_tool,
            response_model=TermsResponse,
            processor=lambda response, output: setattr(response, 'sources', output['terms'])
            if output.get('terms') else None
        )

    def _register_tool_instance(self, tool_instance: BaseTool, response_model: Type[BaseModel], processor: Optional[Callable[[Any, dict], None]] = None):
        """Helper method to register a tool instance with the agent and configure it with ToolHandler using a decorator."""
        async def tool_wrapper(ctx: RunContext[None], **kwargs):
            shop_id_from_context = ""
            if hasattr(ctx, 'data') and isinstance(ctx.data, dict):
                shop_id_from_context = ctx.data.get("shopId", "")
                
            user_message_for_tool = kwargs.get("query") or \
                                  kwargs.get("input") or \
                                  kwargs.get("user_message") or \
                                  kwargs.get("text")
            if user_message_for_tool is None:
                 user_message_for_tool = ""

            actual_result = await tool_instance.run(ctx, shopId=shop_id_from_context, user_message=user_message_for_tool)
            return actual_result
    
        tool_wrapper.__name__ = tool_instance.tool_name

        configured_tool_wrapper = self.tool_handler.tool_config(
            response_model=response_model,
            processor=processor
        )(tool_wrapper)
        
        self.agent.tool(configured_tool_wrapper)

    def _process_product_output(self, response: ProductResponse, output: dict):
        """Special processing for product tool output"""
        processed_products = []
        if output.get("products") and isinstance(output["products"], list):
            for p_data in output["products"]:
                if not isinstance(p_data, dict):
                    logger.warning(f"Skipping non-dict product data: {p_data}")
                    continue
                try:
                    product_id = str(p_data.get("id"))
                    product_name = p_data.get("name") or p_data.get("title")
                    product_price_str = p_data.get("price")
                    product_price = float(product_price_str) if product_price_str is not None else 0.0
                    product_category = p_data.get("category")
                    product_description = p_data.get("description")
                    product_image_url = p_data.get("image_url") or p_data.get("image")
                    product_variant_id = p_data.get("variant_id")

                    if not all([product_id, product_name, product_category]):
                        logger.warning(f"Skipping product with missing essential fields (id, name/title, category): {p_data}")
                        continue

                    processed_products.append(Product(
                        id=product_id,
                        name=product_name,
                        price=product_price,
                        category=product_category,
                        description=product_description,
                        image_url=product_image_url,
                        variant_id=product_variant_id 
                    ))
                except Exception as e:
                    logger.error(f"Error processing individual product data: {p_data}. Error: {e}")

        if processed_products:
            response.products = processed_products
            response.id = [p.id for p in processed_products]
        else:
            response.products = []
            response.id = []
            
        if output.get("categories"):
            response.categories = output["categories"]
        elif processed_products:
            response.categories = extract_categories([p.model_dump() for p in processed_products])
        else:
            response.categories = []

    def _process_order_output(self, response: OrderResponse, output: dict):
        """Special processing for order tool output"""
        if output.get("email"):
            response.email = output["email"]
        if output.get("phone"):
            response.phone = output["phone"]

    async def _execute_primary_agent_call(self, shopId: str, user_message: str) -> Any:
        """Execute the initial agent call with tools. Returns AgentRunResult.
           pydantic-ai handles RunContext creation for tools internally.
        """
        tool_result = await self.agent.run(user_message, temperature=0.7)
        return tool_result

    async def _process_structured_response(
        self,
        tool_name: str,
        tool_output_for_enhanced_msg: dict, 
        raw_tool_data_for_processing: Optional[dict],
        enhanced_message: str
    ) -> BaseResponse:
        """Process the structured response from the agent."""
        logger.info(f"---------Tool Name in process structured response: {tool_name}")

        response_model_cls = self.tool_handler.get_response_model(tool_name)
        logger.info(f"------Response Model Class: {response_model_cls}")

        structured_agent = Agent(
            model=AnthropicModel(model_name=CLAUDE_MODEL_NAME),
            system_prompt=self.FINAL_SYSTEM_MESSAGE,
            result_type=response_model_cls,
            retries=3 
        )
        
        try:
            agent_run_result = await structured_agent.run(enhanced_message.strip(), temperature=0.7)
            logger.info(f"-------Structured Agent Run Result: {agent_run_result}")
            
            agent_pydantic_response = agent_run_result.data

            if tool_name == self.PRODUCT_TOOL_NAME and isinstance(agent_pydantic_response, ProductResponse):
                llm_textual_content = get_llm_text_from_product_response(agent_pydantic_response)
                logger.info(f"LLM textual product response: '{llm_textual_content[:300]}...'")
                logger.info(f"Product tool: LLM directly selected {len(agent_pydantic_response.products if agent_pydantic_response.products else [])} products in the structured response.")

                product_dicts_from_llm_selection = []
                if agent_pydantic_response.products:
                    for p_model in agent_pydantic_response.products:
                        if isinstance(p_model, Product):
                            product_dicts_from_llm_selection.append(p_model.model_dump()) 
                        elif isinstance(p_model, dict):
                            product_dicts_from_llm_selection.append(p_model)
                            logger.warning("Product item from LLM was a dict, not Pydantic model. Used as is.")
                        else:
                            logger.warning(f"Skipping unexpected product item type from LLM: {type(p_model)}")
                
                final_categories = extract_categories(product_dicts_from_llm_selection)
                
                processing_data_for_handler = {
                    "products": product_dicts_from_llm_selection,
                    "categories": final_categories 
                }
                
                self.tool_handler.process_tool_output(tool_name, agent_pydantic_response, processing_data_for_handler)
            
            else:
                current_processing_data = raw_tool_data_for_processing if raw_tool_data_for_processing is not None else tool_output_for_enhanced_msg
                if current_processing_data is None:
                    logger.warning(f"Processing data for tool '{tool_name}' is None. Falling back to empty dict.")
                    current_processing_data = {} 
                self.tool_handler.process_tool_output(tool_name, agent_pydantic_response, current_processing_data)
            
            return agent_pydantic_response
            
        except UnexpectedModelBehavior as e:
            logger.error(f"Model behavior error in structured response for tool '{tool_name}': {e}")
            return create_error_greeting_response()
        except Exception as e:
            logger.error(f"Unexpected error in structured response for tool '{tool_name}': {e}", exc_info=True)
            return create_error_greeting_response()

    async def handle_user_message(self, shopId: str, user_message: str, contents: str) -> dict:
        """Main entry point for handling user messages"""
        try:
            tool_result = await self._execute_primary_agent_call(shopId, user_message)
            logger.info(f"-------Tool Result: {tool_result}")
            
            messages_from_agent = None
            if hasattr(tool_result, 'all_messages') and callable(tool_result.all_messages):
                messages_from_agent = tool_result.all_messages()
                logger.info(f"---------Raw Messages from Agent: {messages_from_agent}")
            
            tool_name, tool_output_for_enhanced_msg, raw_tool_data_for_processing = extract_tool_data_from_agent_messages(
                tool_result, messages_from_agent
            )
            logger.info(f"---------Extracted Tool Name: {tool_name}")
            logger.info(f"---------Tool Output for Enhanced Msg: {type(tool_output_for_enhanced_msg)}")
            logger.info(f"---------Raw Tool Data for Processing: {type(raw_tool_data_for_processing)}")    

            enhanced_message = create_enhanced_message_for_llm(contents, tool_output_for_enhanced_msg)
            logger.info(f"----------Enhanced Message for LLM: {enhanced_message[:300]}...")

            response_data_model_instance = await self._process_structured_response(
                tool_name, 
                tool_output_for_enhanced_msg, 
                raw_tool_data_for_processing,                
                enhanced_message
            )
            logger.info(f"---------Response Data Model Instance: {type(response_data_model_instance)}")

            structured_response_dict = format_agent_response_to_dict(response_data_model_instance)
            logger.info(f"-----------Final Structured Response Dict: {structured_response_dict}")

            return structured_response_dict    
        except Exception as e:
            logger.error(f"Critical error in handle_user_message: {e}", exc_info=True)
            return format_error_dict_for_client()