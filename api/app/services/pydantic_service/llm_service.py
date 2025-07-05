import json
import httpx
from typing import Dict, Any, List

from app.services.pydantic_service.tool_registry import ToolRegistry
from app.constants import CLAUDE_API_URL, CLAUDE_MODEL_NAME 
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
        2. Respond in a warm, polite, and helpful tone.
        3. You will receive the last few messages exchanged between the user and the assistant. Use them to maintain context and continue the conversation naturally.
        4. Use the tool result to decide what to say. You will receive:
           - A list of products (may or may not match the query)
           - A list of categories (suggestions)
           - A 'not_found' flag if no matching products were found
        4. If 'not_found' is True or the products do not match the user's query intent 
           - For e.g., if user ask for gym wear but results are not matching the intent of the query, then - Do **not** show the products
           - Politely say that you couldn’t find exact matches, and suggest the categories
        5. If the user’s query is **generic** (like "show me some products" or "I want to browse"), it’s okay to show the returned products.
        6. NEVER pretend that unrelated products match the query.
        7. NEVER explain tool usage or say “I couldn’t find anything in the database.”
        8. ALWAYS keep the RESPONSE TEXT under 50 words STRICTLY, Don't consider the attibutes (variant_id, links, ids, etc) under word limit.
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
                        return {
                            "answer": final_text, 
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
        logger.info(f"User message: '{user_message}'")
        
        try:
            history_messages = format_message_history(previous_messages or [])
            logger.info(f"History Message before appending the latest message: {history_messages}")

            history_messages.append({"role": "user", "content": user_message})
            logger.info(f"History Message after appending the latest message: {history_messages}")
            
            claude_response = await self.call_claude_with_tools(history_messages, shop_id)
            logger.info(f"Claude Response: {claude_response}")
            
            if not claude_response.get("success", False):
                return claude_response
            
            products = []
            categories = []
            
            for tool_block, result in claude_response.get("tool_results", []):
                if tool_block["name"] == "product":
                    products = result.get("products", [])
                    categories = result.get("categories", [])
            
            return {
                "answer": claude_response.get("answer", ""),
                "products": products,
                "categories": categories,
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