import json
import httpx
from typing import Dict, Any, List

from app.services.pydantic_service.tool_registry import ToolRegistry
from app.constants import CLAUDE_API_URL, CLAUDE_MODEL_NAME, TAG_LIBRARY 
from app.config import ANTHROPIC_API_KEY
from app.utils.rag_pipeline_utils import format_message_history, safe_parse_json
from app.utils.logger import logger

class LLMService:
    """Claude-based LLM Service using Function Tools"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.api_url = CLAUDE_API_URL
        self.model = CLAUDE_MODEL_NAME
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        self.tool_registry = ToolRegistry()
        
        self.system_message = """
        You are a smart and helpful Shopify assistant.

        Always follow these rules strictly:

        1. Answer only store-related questions.
        2. Respond with a warm, polite, and helpful tone by incorporating positive adjectives like "great", "perfect", or "excellent" to maintain an encouraging and supportive manner.
        3. You will receive the last few conversation messages between the user & assistant. Use them to maintain context and continue the conversation naturally.
        4. For product tool - Use the tool result to decide what to say. You will receive:
           - A list of products (may or may not match the query)
           - A list of categories (suggestions)
           - A 'not_found' flag if no matching products were found
           - **If request is successful:** Keep response to 1-2 lines max using "Great choice! Here are your options:" or "Perfect! Here are the products:"
           - **If request is unsuccessful, partially successful, or no results:** Keep response to 1-2 lines max using "Here are available categories. Let me help you find something else? 😊"
           - If the user's message is a single word, or a very short phrase (1–2 words), and it appears to reference a product or category (e.g., “Shoes”, “Black T-shirt”, “Red dress”, “Kids Pants”), you MUST use the product tool. DO NOT respond directly without using the product tool.
           - Even if you're confident you know what the user means, NEVER generate product lists yourself. Always use the tool for any product-related query unless it is a greeting or order-related message.
        5. If 'not_found' is True or the products do not match the user's query intent 
           - For e.g., if user ask for gym wear but results are not matching the intent of the query, then - Do **not** show the products
           - Politely say that you couldn't find exact matches, and suggest the categories
        6. For order-related queries (e.g., "Where is my order?", "My item is damaged", "I want a refund", "I didn't receive my order"), you MUST use the `order` tool to get the store's contact information. Do not answer such queries directly.
           - ALWAYS invoke the `order` tool for order-related intents, even if you think you know the answer.
           - AFTER using the order tool, your response should ONLY guide the user to the provided support contact (email or phone). DO NOT generate fake order details or statuses. DO NOT guess delivery times.
        7. For questions about returns, refunds, exchanges, or cancellations (e.g., "How do I return my item?", "What's your refund policy?", "Can I exchange this product?"), you MUST use the `terms` tool to fetch the correct policy. Do NOT answer such queries directly.
           - Only respond based on the `terms` tool result.   
        8. If the user's query is **generic** (like "show me some products" or "I want to browse"), it's okay to show the returned products.
        8. NEVER pretend that unrelated products match the query.
        10. NEVER explain tool usage or say "I couldn't find anything in the database."
        11  . ALWAYS keep responses concise under 30-50 words STRICTLY. Don't consider attributes (variant_id, links, ids, etc) under word limit.

        **Intent Detection System:**
        - Your job is to identify the **intent** behind the user's query.
        - Based on the message, classify the user's **intent** into one of the following categories:
            - Greeting
            - Product
            - Order
            - ReturnPolicy
        - ALWAYS return a valid JSON response with **both** "answer" and "intent" keys.
        - NEVER respond with plain text. Your full response must be valid JSON (not markdown, not explanation).
        - Example outputs:
        {
            "answer": "Hello! How can I assist you today?",
            "intent": "Greeting"
        }
        {
            "answer": "Sure, here are some black t-shirts you may like!",
            "intent": "Product"
        }
        {
            "answer": "Let me get the store's support contact for your order-related query.",
            "intent": "Order"
        }
        """
    
    async def call_claude_with_tools(self, messages:  List[Dict[str, Any]], shop_id: str) -> Dict[str, Any]:
        """Call Claude API with tool support"""
        tool_results = [] 
        tools_json = self.tool_registry.get_all_tools_for_claude()
        logger.info(f"Tool JSON: {tools_json}")
        
        async with httpx.AsyncClient(timeout=60) as client:
            iteration_count = 0
            max_iterations = 10
            
            while iteration_count < max_iterations:
                iteration_count += 1
                logger.info(f"Claude API call iteration {iteration_count}")
                
                body = {
                    "model": self.model,
                    "max_tokens": 1024,
                    "system": self.system_message,
                    "tools": tools_json,
                    "messages": messages,
                    "tool_choice": {"type": "auto"}
                }
                
                try:
                    response = await client.post(self.api_url, headers=self.headers, json=body)
                    response.raise_for_status()
                    data = response.json()
                    logger.info(f"Response Body: {json.dumps(data, indent=2)}")
                    
                    stop_reason = data.get("stop_reason")
                    logger.info(f"Claude response stop_reason: {stop_reason}")
                    
                    if stop_reason == "tool_use":
                        tool_use_blocks = [c for c in data["content"] if c["type"] == "tool_use"]
                        if not tool_use_blocks:
                            logger.error("Tool use block missing!")
                            break
                        
                        tool_results = []
                        for tool_block in tool_use_blocks:
                            tool_name = tool_block["name"]
                            tool_input = tool_block["input"]
                            
                            logger.info(f"Executing tool: {tool_name} with input: {tool_input}")
                            
                            tool_input["shop_id"] = shop_id
                            
                            result = await self.tool_registry.run_tool(tool_name, **tool_input)
                            tool_results.append((tool_block, result))
                            logger.info(f"Tool {tool_name} result: {result}")
                        
                        messages.append({"role": "assistant", "content": data["content"]})
                        
                        tool_result_content = []
                        for tool_block, result in tool_results:
                            tool_name = tool_block["name"]

                            structured_result = {
                                "tool": tool_name,
                                "tool_use_id": tool_block["id"],
                                "result": result
                            }

                            tool_result_content.append({
                                "type": "tool_result",
                                "tool_use_id": tool_block["id"],
                                "content": json.dumps(structured_result)
                            })
                        
                        messages.append({
                            "role": "user",
                            "content": tool_result_content
                        })
                        
                        continue
                    
                    elif stop_reason == "end_turn":
                        final_text = ""
                        for block in data["content"]:
                            if block["type"] == "text":
                                final_text += block["text"]

                        logger.info(f"Final Claude response: {final_text}")

                        parsed_response = safe_parse_json(final_text) 

                        return {
                            "answer": parsed_response.get("answer", final_text),
                            "intent": parsed_response.get("intent", ""),
                            "success": True,
                            "tool_results": tool_results
                        }
                    
                    else:
                        logger.warning(f"Unknown stop_reason: {stop_reason}")
                        break
                        
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error calling Claude API: {e}")
                    return {
                        "answer": "I'm having trouble connecting right now. Please try again in a moment.",
                        "success": False,
                        "error": str(e)
                    }
                except Exception as e:
                    logger.error(f"Error calling Claude API: {e}", exc_info=True)
                    return {
                        "answer": "Something went wrong. Please try again.",
                        "success": False,
                        "error": str(e)
                    }
            
            logger.warning(f"Maximum iterations ({max_iterations}) reached")
            return {
                "answer": "I'm having trouble processing your request. Please try again.",
                "success": False,
                "error": "Maximum iterations reached"
            }
    
    async def handle_user_message(self, user_message: str, shop_id: str, previous_messages: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle user message and return structured response"""
        logger.info(f"Handling user message for shop_id: '{shop_id}'")
        logger.info(f"\n User message: '{user_message}' \n")
        
        try:
            history_messages = format_message_history(previous_messages or [])
            logger.info(f"History Message before appending the latest message: {history_messages}")

            history_messages.append({"role": "user", "content": user_message})
            logger.info(f"History Message after appending the latest message: {history_messages}")
            
            claude_response = await self.call_claude_with_tools(history_messages, shop_id)
            logger.info(f"Claude Response: {claude_response}")

            products, categories = [], []
            intent = claude_response.get("intent", "")

            tags = TAG_LIBRARY.get(intent, [])

            for tool_block, result in claude_response.get("tool_results", []):
                if tool_block["name"] == "product":
                    products = result.get("products", [])
                    categories = result.get("categories", [])

            return {
                "answer": claude_response.get("answer", ""),
                "products": products,
                "categories": categories,
                "tags": tags,
                "success": True
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