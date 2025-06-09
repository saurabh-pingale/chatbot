import json
import re
from typing import Optional, Any, List, Tuple, Dict

from app.models.api.response import (
    ProductResponse, 
    GreetingResponse, 
    BaseResponse
)
from app.utils.logger import logger

def _parse_tool_return_content(raw_content: Any) -> Any:
    """Parses the raw content from a tool return part."""
    if isinstance(raw_content, str):
        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            return raw_content
        
    elif isinstance(raw_content, list) and len(raw_content) == 1:
        first_item = raw_content[0]
        if hasattr(first_item, 'type') and first_item.type == 'json' and hasattr(first_item, 'json'):
            return first_item.json
    return raw_content

def extract_tool_data_from_agent_messages(
    tool_result: Any, 
    messages_from_tool_result: Optional[List[Any]] = None
) -> Tuple[Optional[str], Optional[Any], Optional[Any]]:
    """Extracts tool name, processed tool output, and raw tool output from agent messages"""

    extracted_tool_name: Optional[str] = None
    parsed_tool_output: Optional[Any] = None 
    llm_summary_text: Optional[str] = None 
    found_tool_call_id: Optional[str] = None

    if messages_from_tool_result:
        # Phase 1: Identify the tool call (ToolCallPart) made by the assistant.
        for message in messages_from_tool_result:
            message_parts = getattr(message, 'parts', None)
            if isinstance(message_parts, list):
                for part in message_parts:
                    is_tool_call_part = (hasattr(part, 'tool_name') and
                                         hasattr(part, 'tool_call_id') and
                                         not hasattr(part, 'content'))
                    if is_tool_call_part:
                        extracted_tool_name = getattr(part, 'tool_name')
                        found_tool_call_id = getattr(part, 'tool_call_id')
                        logger.info(f"[Util] Identified ToolCall: Name='{extracted_tool_name}', ID='{found_tool_call_id}'")
                        break 
                if extracted_tool_name:
                    break 
        
        # Phase 2: Find the result/return for the identified tool call (ToolReturnPart).
        if found_tool_call_id:
            for message in messages_from_tool_result:
                message_parts = getattr(message, 'parts', None)
                if isinstance(message_parts, list):
                    for part in message_parts:
                        is_tool_return_part = (hasattr(part, 'tool_call_id') and
                                               getattr(part, 'tool_call_id') == found_tool_call_id and
                                               hasattr(part, 'content'))
                        if is_tool_return_part:
                            raw_response_content = getattr(part, 'content')
                            parsed_tool_output = _parse_tool_return_content(raw_response_content)
                            logger.info(f"[Util] Found ToolReturn content for ID='{found_tool_call_id}': {type(parsed_tool_output)}")
                            break  
                    if parsed_tool_output is not None:
                        break  

    # Fallback logic using `tool_result` if data wasn't found in `messages_from_tool_result` or to supplement missing pieces.
    if parsed_tool_output is None and hasattr(tool_result, 'data') and tool_result.data is not None:
        if isinstance(tool_result.data, str) and not extracted_tool_name:
            llm_summary_text = tool_result.data
            logger.info(f"[Util] Used tool_result.data as llm_summary_text (string): {llm_summary_text[:100]}...")
        elif extracted_tool_name:
            parsed_tool_output = tool_result.data
            logger.info(f"[Util] Used tool_result.data as parsed_tool_output for tool: {extracted_tool_name}")
        elif not isinstance(tool_result.data, str) and extracted_tool_name is None:
             parsed_tool_output = tool_result.data
             logger.info(f"[Util] Used tool_result.data as parsed_tool_output (no prior tool name): {type(parsed_tool_output)}")

    # Try to get llm_summary_text from tool_result.output if not already set
    if llm_summary_text is None and hasattr(tool_result, 'output') and tool_result.output is not None:
        if isinstance(tool_result.output, str):
            llm_summary_text = tool_result.output
            logger.info(f"[Util] Captured llm_summary_text from tool_result.output: {llm_summary_text[:100]}...")
        elif parsed_tool_output is None:
            parsed_tool_output = tool_result.output
            logger.info(f"[Util] Used tool_result.output as parsed_tool_output (was not string summary): {type(parsed_tool_output)}")

    # Determine the primary data to be used by LLM: tool output takes precedence over summary.
    final_content_for_llm = parsed_tool_output if parsed_tool_output is not None else llm_summary_text

    if final_content_for_llm is parsed_tool_output and parsed_tool_output is not None:
        logger.info("[Util] final_content_for_llm is using parsed_tool_output.")
    elif final_content_for_llm is llm_summary_text and llm_summary_text is not None:
        logger.info("[Util] final_content_for_llm is using llm_summary_text as fallback.")

    # Fallback for extracting tool name directly from tool_result.data object if not found earlier
    if extracted_tool_name is None and hasattr(tool_result, 'data'):
        tool_name_on_data = getattr(tool_result.data, 'tool_name', None)
        if isinstance(tool_name_on_data, str):
            extracted_tool_name = tool_name_on_data
            logger.info(f"[Util] Tool name extracted from tool_result.data.tool_name as fallback: {extracted_tool_name}")

    # The `raw_data_for_processing` was essentially `actual_tool_result_content` (now `parsed_tool_output`)
    raw_tool_output = parsed_tool_output
    if raw_tool_output is None:
         logger.info("[Util] raw_tool_output is None as parsed_tool_output was not found or set.")

    return extracted_tool_name, final_content_for_llm, raw_tool_output

def create_enhanced_message_for_llm(user_message: str, tool_data: Any) -> str:
    """Creates an enhanced message string for the second LLM call, including user message and tool output."""
    if isinstance(tool_data, str):
        tool_output_str = json.dumps(tool_data)
    else:
        tool_output_str = json.dumps(tool_data)

    tool_output_str = json.dumps(tool_data)
    return f"User Message: {user_message}\n\nTool Output: {tool_output_str}"

def filter_products_from_tool_output(llm_response_text: str, all_tool_products: List[Dict]) -> List[Dict]:
    """
    Filters products from the tool's output based on mentions (ID or name) 
    in the LLM's textual response. ID matches are prioritized.
    """
    llm_response_text_lower = llm_response_text.lower()
    found_products_map: Dict[str, Dict] = {}

    # Phase 1: Match products by explicitly mentioned IDs in the LLM text.
    mentioned_ids = set(re.findall(r'[\(\[]?id[:\s]?\s*(\d+)[\)\]]?', llm_response_text_lower))
    if mentioned_ids:
        logger.info(f"[Util] IDs explicitly mentioned in LLM text for filtering: {mentioned_ids}")

    for product_data in all_tool_products:
        if not isinstance(product_data, dict):
            logger.warning(f"[Util] Skipping non-dict item in all_tool_products: {product_data}")
            continue
        
        product_id_str = str(product_data.get("id", "")).lower()
        if not product_id_str: 
            continue
        
        if product_id_str in mentioned_ids:
            if product_id_str not in found_products_map:
                found_products_map[product_id_str] = product_data
                logger.info(f"[Util] Product matched by explicitly mentioned ID '{product_id_str}' from LLM text.")

    # Phase 2: Match remaining products by name if their name appears in the LLM text.
    for product_data in all_tool_products:
        if not isinstance(product_data, dict): 
            continue
        
        product_id_str = str(product_data.get("id", "")).lower()
        if not product_id_str or product_id_str in found_products_map:
            continue

        product_name_lower = str(product_data.get("title", "")).lower()
        if not product_name_lower: 
            continue

        if product_name_lower in llm_response_text_lower:
            if product_id_str not in found_products_map:
                found_products_map[product_id_str] = product_data
                logger.info(f"[Util] Product '{product_name_lower}' (ID: {product_id_str}) matched by name in LLM text.")
    
    filtered_list = list(found_products_map.values())
    logger.info(f"[Util] Filtered Products: Matched {len(filtered_list)} products from {len(all_tool_products)} total. "
                f"LLM response sample: '{llm_response_text_lower[:200]}...'")
    return filtered_list

def extract_normalized_response_text(product_response_data: ProductResponse) -> str:
    """Extracts and concatenates textual fields from ProductResponse for filtering purposes."""
    text_parts = []
    introduction = getattr(product_response_data, 'introduction', None)
    if introduction:
        text_parts.append(str(introduction).lower())

    closing = getattr(product_response_data, 'closing', None)
    if closing:
        text_parts.append(str(closing).lower())
        
    return " ".join(text_parts)

def create_error_greeting_response() -> GreetingResponse:
    """Creates a standardized error response in the form of a GreetingResponse."""
    ERROR_WELCOME_MESSAGE = "I apologize, but I'm having trouble processing your request right now."
    ERROR_PRODUCT_PROMPT = "Please try asking again or contact support if the issue persists."
    return GreetingResponse(
        welcome_message=ERROR_WELCOME_MESSAGE,
        product_prompt=ERROR_PRODUCT_PROMPT
    )

def _get_standard_fallback_dict() -> Dict[str, Any]:
    """Returns a standardized fallback dictionary structure for responses."""
    return {
        "answer": "Something went wrong. Please try again! ",
        "products": [],
        "categories": [],
        "success": False,
        "error": None
    }

def format_agent_response_to_dict(response: Any) -> Dict[str, Any]:
    """Converts a Pydantic model response or a dictionary to a standardized dictionary format."""
    if hasattr(response, 'model_dump'):
        response_dict = response.model_dump()
    elif hasattr(response, 'dict'):
        response_dict = response.dict()
    elif isinstance(response, dict):
        response_dict = response
    else:
        logger.warning(f"[Util] format_agent_response_to_dict received unexpected type: {type(response)}. Using fallback.")
        return _get_standard_fallback_dict()

    answer_keys_priority = [
        "welcome_message", "response", "introduction", 
        "suggestions", "response_text", "answer"
    ]
    answer_text = "I couldn't process your request"

    for key in answer_keys_priority:
        value = response_dict.get(key)
        if value and isinstance(value, str):
            answer_text = value
            break
    
    success_status = response_dict.get("success", False)
    if "success" not in response_dict and isinstance(response, BaseResponse):
         success_status = response.success

    final_success_status = True if success_status is True else False

    return {
        "answer": answer_text,
        "products": response_dict.get("products") or [],
        "categories": response_dict.get("categories") or [],
        "success": final_success_status,
        "error": response_dict.get("error")
    }

def format_error_dict_for_client() -> Dict[str, Any]:
    """Returns a standardized error dictionary for client-facing errors."""
    return {
        "answer": "I'm having technical difficulties. Please try again later.",
        "products": [],
        "categories": [],
        "success": False,
        "error": "Internal server error"
    } 