import json
from typing import Optional, Any
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.exceptions import UnexpectedModelBehavior

from app.constants import CLAUDE_MODEL_NAME
from app.models.api.response import (
    Product,
    GreetingResponse,
    ProductResponse,
    OrderResponse,
    TermsResponse,
    BaseResponse
)
from app.utils.rag_pipeline_utils import extract_categories

from app.services.pydantic_service.tool_handler import ToolHandler
from app.services.pydantic_service.tools.base_tool import BaseTool
from app.services.pydantic_service.tools.greeting_tool import GreetingTool
from app.services.pydantic_service.tools.product_tool import ProductTool 
from app.services.pydantic_service.tools.order_tool import OrderTool
from app.services.pydantic_service.tools.terms_tool import TermsTool

class ClaudeService:
    """Main service handling Claude interactions with dynamic tool support"""
    
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
    You are a smart, friendly, and helpful AI assistant for a Shopify store. You are capable of handling various customer support and product-related tasks using a set of specialized tools:

    - For **greeting**: Respond in a warm and friendly shopping assistant tone. Mention top categories (if available).
    - For **product inquiries**: Help users discover or learn about available products, categories, or features by searching the store's catalog. You must not invent or mention products or categories that do not exist in the store.
    - For **order support**: Answer user questions about order status, how to contact support (email or phone), or related logistics.
    - For **terms or policies**: Use the knowledge from the store's terms context to answer questions related to shipping, return policies, or store regulations.

    Guidelines:
    - Never hallucinate product or policy information.
    - If a user asks about an unavailable product/category, politely clarify that you can only help with products listed in this store.
    - Be concise, helpful, and structured in your responses.
    - For product listings, always include bullet points, prices, and product `id`s next to the name in brackets.
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
        # self._register_response_handlers()

    def _register_tools(self):
        """Register all available tools"""
        self._register_greeting_tool()
        self._register_product_tool()
        self._register_order_tool()
        self._register_terms_tool()

    def _register_greeting_tool(self):
        """Register greeting tool"""
        greeting_tool = GreetingTool()
        self._register_tool_instance(greeting_tool)
        self.tool_handler.register_tool(
            "greeting",
            GreetingResponse,
            lambda response, output: setattr(
                response, 
                'category_mention', 
                f"Some popular categories: {', '.join(output['categories'])}"
            ) if output.get("categories") else None
        )

    def _register_product_tool(self):
        """Register product tool"""
        product_tool = ProductTool(self.test_mode, self.failure_rate)
        self._register_tool_instance(product_tool)
        self.tool_handler.register_tool(
            "product",
            ProductResponse,
            self._process_product_output
        )

    def _register_order_tool(self):
        """Register order tool"""
        order_tool = OrderTool()
        self._register_tool_instance(order_tool)
        self.tool_handler.register_tool(
            "order",
            OrderResponse,
            self._process_order_output
        )

    def _register_terms_tool(self):
        """Register terms tool"""
        terms_tool = TermsTool()
        self._register_tool_instance(terms_tool)
        self.tool_handler.register_tool(
            "terms",
            TermsResponse,
            lambda response, output: setattr(response, 'sources', output['terms'])
            if output.get('terms') else None
        )

    def _register_tool_instance(self, tool_instance: BaseTool):
        """Helper method to register a tool instance"""
        async def tool_wrapper(ctx: RunContext[None], **kwargs):
            return await tool_instance.run(ctx, **kwargs)
    
        tool_wrapper.__name__ = tool_instance.tool_name
        self.agent.tool(tool_wrapper)

    def _process_product_output(self, response: ProductResponse, output: dict):
        """Special processing for product tool output"""
        if output.get("products"):
            try:
                response.products = [Product(**p) for p in output["products"]]
                response.id = [p.id for p in response.products]
            except Exception as e:
                print(f"Error processing products: {e}")
                response.products = []
                response.id = []
        if output.get("categories"):
            response.categories = output["categories"]

    def _process_order_output(self, response: OrderResponse, output: dict):
        """Special processing for order tool output"""
        if output.get("email"):
            response.email = output["email"]
        if output.get("phone"):
            response.phone = output["phone"]

    async def _execute_primary_agent_call(self, user_message: str) -> Any:
        """Execute the initial agent call with tools"""
        print("DEBUG: Sending message to Claude:", user_message)
        return await self.agent.run(user_message, temperature=0.7)

    def _extract_tool_data(self, tool_result: Any) -> tuple[Optional[str], Optional[dict], Optional[dict]]:
        """Extract tool name and output from the agent result"""
        tool_name = None
        tool_output = None
        raw_tool_data = None
        
        if hasattr(tool_result, 'all_messages'):
            for message in tool_result.all_messages():
                if hasattr(message, 'parts'):
                    for part in message.parts:
                        if hasattr(part, 'tool_name'):
                            tool_name = part.tool_name
                            print(f"------Tool Name: {tool_name}")
                            if hasattr(part, 'content'):
                                try:
                                    raw_tool_data = part.content
                                    print(f"------Raw Tool Data: {raw_tool_data}")
                                except:
                                    pass
                            break
                elif hasattr(message, 'content'):
                    for content_part in message.content:
                        if hasattr(content_part, 'tool_name'):
                            tool_name = content_part.tool_name
                            print(f"------Tool Name: {tool_name}")
                            if hasattr(content_part, 'content'):
                                raw_tool_data = content_part.content
                                print(f"------Raw Tool Data: {raw_tool_data}")
                            break
                if tool_name:
                    break
        
        if hasattr(tool_result, 'data') and tool_result.data:
            tool_output = tool_result.data
            print(f"-------Tool Output: {tool_output}")
        
        return tool_name, tool_output, raw_tool_data

    def _create_fallback_response(self) -> GreetingResponse:
        """Create a fallback greeting response"""
        return GreetingResponse(
            welcome_message="Hello! How can I help you today?",
            product_prompt="Would you like to browse our products?"
        )

    def _create_enhanced_message(self, user_message: str, tool_output: dict) -> str:
        """Create enhanced message for structured response"""
        return f"User Message: {user_message}\n\nTool Output: {json.dumps(tool_output)}"

    def _filter_products(self, response_text: str, all_products: list[dict]) -> list[dict]:
        """Filter products based on what's mentioned in the response"""
        response_text = response_text.lower()
        filtered_products = []

        for p in all_products:
            if isinstance(p, dict):
                product_id = str(p.get("id", "")).lower()
                product_name = str(p.get("name", "")).lower()
                if product_id in response_text or any(word in product_name for word in response_text.split()):
                    filtered_products.append(p)
            else:
                print(f"Warning: Unexpected product format: {type(p)} - {p}")

        print(f"Debug: Filtered {len(filtered_products)} products from {len(all_products)}")
        return filtered_products

    async def _process_structured_response(
        self,
        tool_name: str,
        tool_output: dict,
        raw_tool_data: Optional[dict],
        enhanced_message: str
    ) -> BaseResponse:
        """Process the structured response from the agent"""
        response_model = self.tool_handler.get_response_model(tool_name)
        print(f"------Response Model: {response_model}")

        structured_agent = Agent(
            model=AnthropicModel(model_name=CLAUDE_MODEL_NAME),
            system_prompt=self.FINAL_SYSTEM_MESSAGE,
            result_type=response_model,
            retries=3 
        )
        
        try:
            response = await structured_agent.run(enhanced_message.strip(), temperature=0.7)
            print(f"-------Response: {response}")
            
            processing_data = raw_tool_data if raw_tool_data else tool_output
            self.tool_handler.process_tool_output(tool_name, response.data, tool_output)
            
            if tool_name == "product" and hasattr(response.data, 'products') and response.data.products:
                response_text = ""
                if hasattr(response.data, 'introduction'):
                    response_text = response.data.introduction.lower()
                elif hasattr(response.data, 'closing'):
                    response_text = response.data.closing.lower()

                print(f"Debug: Response text for filtering: {response_text}")
                
                all_products = []
                if isinstance(raw_tool_data, dict) and raw_tool_data.get("products"):
                    all_products = raw_tool_data["products"]
                elif isinstance(tool_output, dict) and tool_output.get("products"):
                    all_products = tool_output["products"]
                elif hasattr(response.data, 'products') and response.data.products:
                    all_products = [
                        {
                            "id": p.id,
                            "name": p.name,
                            "price": p.price,
                            "category": p.category,
                            "description": p.description,
                            "image_url": p.image_url
                        }
                        for p in response.data.products
                    ]

                if all_products:
                    filtered_products = self._filter_products(response_text, all_products)
                    if filtered_products:
                        try:
                            response.data.products = [Product(**p) for p in filtered_products]
                            response.data.id = [p["id"] for p in filtered_products]
                            response.data.categories = extract_categories(filtered_products)
                        except Exception as e:
                            print(f"Error creating filtered products: {e}")
            
            return response.data
            
        except UnexpectedModelBehavior as e:
            print(f"Model behavior error in structured response: {e}")
            return self._create_error_response()
        except Exception as e:
            print(f"Unexpected error in structured response: {e}")
            return self._create_error_response()

    def _create_error_response(self) -> GreetingResponse:
        """Create an error response"""
        return GreetingResponse(
            welcome_message="I apologize, but I'm having trouble processing your request right now.",
            product_prompt="Please try asking again or contact support if the issue persists."
        )

    async def handle_user_message(self, contents: str) -> BaseResponse:
        """Main entry point for handling user messages"""
        try:
            tool_result = await self._execute_primary_agent_call(contents)
            tool_name, tool_output, raw_tool_data = self._extract_tool_data(tool_result)
            
            if not tool_name or not tool_output:
                return self._create_fallback_response()
                
            enhanced_message = self._create_enhanced_message(contents, tool_output)
            return await self._process_structured_response(
                tool_name, 
                tool_output, 
                raw_tool_data, 
                enhanced_message
            )
                
        except UnexpectedModelBehavior as e:
            print(f"Model behavior error in tool execution: {e}")
            return GreetingResponse(
                welcome_message="I'm having some technical difficulties right now.",
                product_prompt="Please try again in a moment or contact support if needed."
            )
        except Exception as e:
            print(f"Unexpected error in handle_user_message: {e}")
            return GreetingResponse(
                welcome_message="I'm sorry, but I encountered an error while processing your request.",
                product_prompt="Please try again or contact support if the problem persists."
            )