from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, UserPromptPart, TextPart
from typing import List, Dict, Any

def extract_products_from_response(query_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts and filters products from query results."""
    products = []
    for result in query_results:
        if result and hasattr(result, 'metadata') and result.metadata:
            product_id = getattr(result, 'id', None)
            product = {
                "id": str(product_id) if product_id is not None else None,
                "name": getattr(result.metadata, 'title', None),
                "price": getattr(result.metadata, 'price', None),
                "url": getattr(result.metadata, 'url', None),
                "image_url": getattr(result.metadata, 'image', None),
                "category": getattr(result.metadata, 'category', None),
                "variant_id": getattr(result.metadata, 'variant_id', None),
            }
            products.append(product)
    
    return [product for product in products if product["name"] and product["image_url"]]

def extract_categories(transformed_products):
    return list({str(p.get("category", "")) for p in transformed_products if p.get("category")})

def format_message_history(previous_messages: List[Dict[str, Any]]) -> List[ModelMessage]:
    """Format previous messages for the agent's message history."""
    formatted_messages = []
    
    for msg in previous_messages:
        msg_type = msg.get('type', 'user')
        content = msg.get('content', '')

        if not content or content == "I'm an AI assistant — learning every day. How can I help?":
            continue
        
        if msg_type == 'user':
            formatted_messages.append(
                ModelRequest(parts=[UserPromptPart(content=content)])
            )
        elif msg_type == 'bot':
            formatted_messages.append(
                ModelResponse(parts=[TextPart(content=content)])
            )
    
    return formatted_messages