import json
import re
from typing import Optional, Any, List, Tuple, Dict

from app.models.api.response import (
    ProductResponse, 
    GreetingResponse, 
    BaseResponse
)
from app.utils.logger import logger

def extract_tool_data_from_agent_messages(
    tool_result: Any, 
    messages_from_tool_result: Optional[List[Any]] = None
) -> Tuple[Optional[str], Optional[Any], Optional[Any]]:
    """Extract tool name and structured output from pydantic-ai agent messages."""
    extracted_tool_name = None
    actual_tool_result_content = None
    llm_summary_after_tool = None 
    tool_call_id_found = None

    if messages_from_tool_result:
        # Phase 1: Identify the tool call (ToolCallPart) made by the assistant.
        for message_item in messages_from_tool_result:
            if hasattr(message_item, 'parts') and isinstance(message_item.parts, list):
                for part in message_item.parts:
                    if hasattr(part, 'tool_name') and hasattr(part, 'tool_call_id') and not hasattr(part, 'content'):
                        extracted_tool_name = part.tool_name
                        tool_call_id_found = part.tool_call_id
                        logger.info(f"[Util] Identified ToolCall: Name='{extracted_tool_name}', ID='{tool_call_id_found}'")
                        break
                if extracted_tool_name:
                    break
        
        # Phase 2: Find the result/return for the identified tool call (ToolReturnPart).
        if tool_call_id_found:
            for message_item in messages_from_tool_result:
                if hasattr(message_item, 'parts') and isinstance(message_item.parts, list):
                    for part in message_item.parts:
                        if hasattr(part, 'tool_call_id') and part.tool_call_id == tool_call_id_found and hasattr(part, 'content'):
                            raw_tool_response_content = part.content
                            if isinstance(raw_tool_response_content, str):
                                try: actual_tool_result_content = json.loads(raw_tool_response_content)
                                except json.JSONDecodeError: actual_tool_result_content = raw_tool_response_content
                            elif isinstance(raw_tool_response_content, list) and len(raw_tool_response_content) > 0 and \
                                    hasattr(raw_tool_response_content[0], 'type') and raw_tool_response_content[0].type == 'json' and \
                                    hasattr(raw_tool_response_content[0], 'json'):
                                actual_tool_result_content = raw_tool_response_content[0].json
                            else: actual_tool_result_content = raw_tool_response_content
                            logger.info(f"[Util] Found ToolReturn content for ID='{tool_call_id_found}': {type(actual_tool_result_content)}")
                            break
                if actual_tool_result_content is not None:
                    break
    
    if actual_tool_result_content is None and hasattr(tool_result, 'data') and tool_result.data is not None:
        if isinstance(tool_result.data, str):
            llm_summary_after_tool = tool_result.data
        elif extracted_tool_name: 
            actual_tool_result_content = tool_result.data
            logger.info(f"[Util] Used tool_result.data as actual_tool_result_content for tool: {extracted_tool_name}")

    if hasattr(tool_result, 'output') and tool_result.output is not None:
        if llm_summary_after_tool is None:
             llm_summary_after_tool = tool_result.output
             logger.info(f"[Util] Captured llm_summary_after_tool from tool_result.output")
   
    data_for_enhanced_message = actual_tool_result_content if actual_tool_result_content is not None else llm_summary_after_tool
    if data_for_enhanced_message is actual_tool_result_content:
        logger.info("[Util] data_for_enhanced_message is using actual_tool_result_content.")
    elif data_for_enhanced_message is llm_summary_after_tool:
         logger.info("[Util] data_for_enhanced_message is using llm_summary_after_tool as fallback.")

    raw_data_for_processing = actual_tool_result_content
    if raw_data_for_processing is None:
        logger.info("[Util] raw_data_for_processing is None as actual_tool_result_content was not found.")

    if extracted_tool_name is None and hasattr(tool_result, 'data') and \
       hasattr(tool_result.data, 'tool_name') and isinstance(getattr(tool_result.data, 'tool_name', None), str):
         extracted_tool_name = tool_result.data.tool_name
         logger.info(f"[Util] Tool name extracted from tool_result.data.tool_name as fallback: {extracted_tool_name}")

    return extracted_tool_name, data_for_enhanced_message, raw_data_for_processing

def create_enhanced_message_for_llm(user_message: str, tool_data: Any) -> str:
    """Creates an enhanced message string for the second LLM call, including user message and tool output."""
    tool_output_str = json.dumps(tool_data) if not isinstance(tool_data, str) else json.dumps(str(tool_data))
    return f"User Message: {user_message}\n\nTool Output: {tool_output_str}"

def filter_products_from_tool_output(response_text: str, all_tool_products: List[Dict]) -> List[Dict]:
    """Filters products from the tool's output based on mentions (ID or name) in the LLM's textual response."""
    response_text_lower = response_text.lower()
    found_products = {}

    mentioned_ids = set(re.findall(r'[\(\[]?id[:\s]?\s*(\d+)[\)\]]?', response_text_lower))
    logger.info(f"[Util] IDs explicitly mentioned in LLM text for filtering: {mentioned_ids}")

    for p_dict in all_tool_products:
        if not isinstance(p_dict, dict):
            logger.warning(f"[Util] Skipping non-dict item in all_tool_products: {p_dict}")
            continue
        
        tool_product_id_str = str(p_dict.get("id", "")).lower()
        
        if tool_product_id_str in mentioned_ids:
            if tool_product_id_str not in found_products:
                found_products[tool_product_id_str] = p_dict
                logger.info(f"[Util] Product matched by explicitly mentioned ID '{tool_product_id_str}' from LLM text.")
            continue 

    for p_dict in all_tool_products:
        if not isinstance(p_dict, dict): continue
        
        tool_product_id_str = str(p_dict.get("id", "")).lower()
        if tool_product_id_str in found_products: continue 

        tool_product_name_lower = str(p_dict.get("title", "")).lower()
        if not tool_product_name_lower: continue

        if tool_product_name_lower in response_text_lower:
            if tool_product_id_str not in found_products:
                found_products[tool_product_id_str] = p_dict
                logger.info(f"[Util] Product '{tool_product_name_lower}' (ID: {tool_product_id_str}) matched by name in LLM text.")
            continue
    
    filtered_list = list(found_products.values())
    logger.info(f"[Util] _filter_products: Matched {len(filtered_list)} products from {len(all_tool_products)}. Response text sample: '{response_text_lower[:200]}...'")
    return filtered_list

def get_llm_text_from_product_response(product_response_data: ProductResponse) -> str:
    """Extracts and concatenates textual fields from ProductResponse for filtering purposes."""
    text_parts = []
    if hasattr(product_response_data, 'introduction') and product_response_data.introduction:
        text_parts.append(product_response_data.introduction.lower())
    if hasattr(product_response_data, 'closing') and product_response_data.closing:
        text_parts.append(product_response_data.closing.lower())
    return " ".join(text_parts)

def create_error_greeting_response() -> GreetingResponse:
    """Creates a standardized error response in the form of a GreetingResponse."""
    return GreetingResponse(
        welcome_message="I apologize, but I'm having trouble processing your request right now.",
        product_prompt="Please try asking again or contact support if the issue persists."
    )

def _format_fallback_dict() -> Dict[str, Any]:
    """Returns a standardized fallback dictionary structure for responses."""
    return {
        "answer": "Something went wrong, Please try again! ",
        "products": [],
        "categories": [],
        "success": False,
        "error": None
    }

def format_agent_response_to_dict(response: Any) -> Dict[str, Any]:
    """Converts a Pydantic model response or a dictionary to a standardized dictionary format."""
    if hasattr(response, 'dict'): # Pydantic model
        response_dict = response.dict()
        answer_text = (
            response_dict.get("welcome_message") or
            response_dict.get("response") or
            response_dict.get("introduction") or
            response_dict.get("suggestions") or
            response_dict.get("response_text") or
            response_dict.get("answer") or
            "I couldn't process your request"
        )
        return {
            "answer": answer_text,
            "products": response_dict.get("products") or [],
            "categories": response_dict.get("categories") or [],
            "success": response_dict.get("success", isinstance(response, BaseResponse) and response.success),
            "error": response_dict.get("error")
        }
    elif isinstance(response, dict):
        return {
            "answer": response.get("answer", "I couldn't process your request"),
            "products": response.get("products", []),
            "categories": response.get("categories", []),
            "success": response.get("success", False),
            "error": response.get("error")
        }
    logger.warning(f"[Util] format_agent_response_to_dict received unexpected type: {type(response)}. Using fallback.")
    return _format_fallback_dict()

def format_error_dict_for_client() -> Dict[str, Any]:
    """Returns a standardized error dictionary for client-facing errors."""
    return {
        "answer": "I'm having technical difficulties. Please try again later.",
        "products": [],
        "categories": [],
        "success": False,
        "error": "Internal server error"
    } 