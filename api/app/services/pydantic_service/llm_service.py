import json
import httpx
from pydantic import BaseModel
from typing import Dict, Any, List, Union

from app.services.pydantic_service.tool_registry import ToolRegistry
from app.constants import CLAUDE_API_URL, CLAUDE_MODEL_NAME, TAG_LIBRARY 
from app.config import ANTHROPIC_API_KEY
from app.utils.rag_pipeline_utils import format_message_history
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
        4. For product tool - YOU MUST ONLY use tool result to decide what to say. You will receive:
           - A list of products (may or may not match the query)
           - A list of categories (suggestions)
           - A 'not_found' flag if no matching products were found
           - **If request is successful:** Keep response to 1-2 lines max using "Great choice! Here are your options:" or "Perfect! Here are the products:"
           - **If request is unsuccessful, partially successful, or no results:** Keep response to 1-2 lines max using "Here are available categories. Let me help you find something else? 😊"
           - **CONTEXT-AWARE RESPONSES:** If user asks about "above products", "these products", "those items", or refers to previously mentioned products, DO NOT use any tools. Instead, refer to the conversation history to provide information about those products.
        5. If 'not_found' is True or the products do not match the user's query intent 
           - For e.g., if user ask for gym wear but results are not matching the intent of the query, then - Do **not** show the products
           - Politely say that you couldn't find exact matches, and suggest the categories
        6. If the user's query is **generic** (like "show me some products" or "I want to browse collections"), it's okay to show the returned products.
        7. NEVER pretend that unrelated products or unrelated information to match the query.
        8. For greeting messages (hi, hello, welcome, etc.), YOU MUST ONLY use the `greeting` tool first before responding.
        9. For policy questions (returns, refunds, cancellations, shipping), YOU MUST ONLY use the terms tool first before responding.
        10. For order-related questions (tracking, status, refunds, damaged items, delivery issues, cancellations), YOU MUST ONLY use the `order` tool first before responding.
        11. NEVER explain tool usage or say "I couldn't find anything in the database."
        12. ALWAYS keep responses concise under 30-50 words STRICTLY. Don't consider attributes (variant_id, links, ids, etc) under word limit.
        13. For long content ONLY, use bullet points within the string (e.g., "• Point 1 • Point 2")
        """
    
    async def call_claude_with_tools(self, messages: Union[str, List[Dict[str, Any]]], shop_id: str) -> Dict[str, Any]:
        """Call Claude API with tool support"""
        tool_results = [] 
        tools_json = self.tool_registry.get_all_tools_for_claude()
        logger.info(f"Tool JSON: {tools_json}")
        
        async with httpx.AsyncClient(timeout=60) as client:
            logger.info("Claude API call with tool_choice: any")
            
            body = {
                "model": self.model,
                "max_tokens": 1024,
                "system": self.system_message,
                "tools": tools_json,
                "messages": messages,
                "tool_choice": {"type": "any"}
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
                        return {
                            "answer": "I'm having trouble processing your request. Please try again.",
                            "success": False,
                            "error": "Tool use block missing"
                        }
                    
                    for tool_block in tool_use_blocks:
                        tool_name = tool_block["name"]
                        tool_input = tool_block["input"]
                        
                        logger.info(f"Executing tool: {tool_name} with input: {tool_input}")
                        
                        tool_input_with_shop = tool_input.copy()
                        tool_input_with_shop["shop_id"] = shop_id
                        
                        result = await self.tool_registry.run_tool(tool_name, **tool_input_with_shop)
                        tool_results.append((tool_block, result))
                        logger.info(f"\n Tool {tool_name} executed successfully \n")
                        logger.info(f"\n Tool {tool_name} result: {result} \n")
                    
                    messages.append({"role": "assistant", "content": data["content"]})
                    
                    tool_result_content = []
                    for tool_block, result in tool_results:
                        structured_result = {
                            "tool": tool_block["name"],
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
                    
                    final_body = {
                        "model": self.model,
                        "max_tokens": 1024,
                        "system": self.system_message,
                        "tools": tools_json,
                        "messages": messages
                    }
                    
                    final_response = await client.post(self.api_url, headers=self.headers, json=final_body)
                    final_data = final_response.json()
                    logger.info(f"Final Response Body: {json.dumps(final_data, indent=2)}")
                    
                    final_text = ""
                    for block in final_data["content"]:
                        if block["type"] == "text":
                            final_text += block["text"]

                    logger.info(f"Final Claude response: {final_text}") 

                    return {
                        "answer": final_text,
                        "success": True,
                        "tool_results": tool_results
                    }
                
                elif stop_reason == "end_turn":
                    final_text = ""
                    for block in data["content"]:
                        if block["type"] == "text": 
                            final_text += block["text"]

                    logger.info(f"Direct Claude response: {final_text}")

                    return {
                        "answer": final_text,
                        "success": True,
                        "tool_results": tool_results
                    }
                
                else:
                    logger.warning(f"Unknown stop_reason: {stop_reason}")
                    return {
                        "answer": "I'm having trouble processing your request. Please try again.",
                        "success": False,
                        "error": f"Unknown stop_reason: {stop_reason}"
                    }
                    
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
    
    async def handle_user_message(self, user_message: str, shop_id: str, previous_messages: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle user message and return structured response"""
        logger.info(f"\n User message: '{user_message}' \n")
        
        try:
            history_messages = format_message_history(previous_messages or [])
            logger.info(f"History Message before appending the latest message: {history_messages}")

            history_messages.append({"role": "user", "content": user_message})
            logger.info(f"History Message after appending the latest message: {history_messages}")

            claude_response = await self.call_claude_with_tools(history_messages, shop_id)
            logger.info(f"Claude Response: {claude_response}")

            products, categories = [], []
            tool_used = None

            for tool_block, result in claude_response.get("tool_results", []):
                tool_name = tool_block.get("name")
                logger.info(f"Tool Name: {tool_name}")
                tool_used = tool_used or tool_name

                if tool_name == "product":
                    result_dict = result.model_dump() if isinstance(result, BaseModel) else result
                    products = result_dict.get("products", [])
                    categories = result_dict.get("categories", [])
            
            tags = (
                TAG_LIBRARY.get(tool_used, []) or
                [{"name": category, "description": f"Explore products from the {category} category"} for category in categories]
            ) if tool_used else []

            return {
                "answer": claude_response.get("answer", ""),
                "products": products,
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