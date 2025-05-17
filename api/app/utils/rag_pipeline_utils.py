from typing import List, Dict, Any
import re

def extract_products_from_response(query_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts and filters products from query results."""
    products = []
    for result in query_results:
        if result and hasattr(result, 'metadata') and result.metadata:
            # Extract all available metadata fields
            product = {
                "id": getattr(result, 'id', None),
                "title": getattr(result.metadata, 'title', None),
                "description": getattr(result.metadata, 'description', None), 
                "price": getattr(result.metadata, 'price', None),
                "url": getattr(result.metadata, 'url', None),
                "image": getattr(result.metadata, 'image', None),
                "category": getattr(result.metadata, 'category', None),
                "variant_id": getattr(result.metadata, 'variant_id', None),
            }
            products.append(product)
    
    return [product for product in products if product["title"] and product["url"]]

def format_context_texts(query_results: List[Any]) -> str:
    """Formats context texts from query results."""
    return "\n".join(
        f"Product: ID: {getattr(result, 'id', 'N/A')}, Title: {result.metadata.title}, Description: {result.metadata.description}, "
        f"Category: {result.metadata.category}, Price: {result.metadata.price}."
        for result in query_results
        if result and result.metadata
    )

def extract_categories(transformed_products):
    return list({str(p.get("category", "")) for p in transformed_products if p.get("category")})

def extract_metadata_from_message(user_message: str):
    """Extracts possible metadata filters (e.g., category, price, color) from the user message."""
    metadata = {}
    
    category_match = re.search(r"category[:\s]+([a-zA-Z0-9\s]+?)(?:\s|$|\.|\,)", user_message, re.IGNORECASE)
    if category_match:
        metadata["category"] = category_match.group(1).strip()
    
    price_match = re.search(r"price[:\s]+(\d+)[\s-]+(\d+)", user_message, re.IGNORECASE)
    if price_match:
        metadata["price_min"] = int(price_match.group(1))
        metadata["price_max"] = int(price_match.group(2))
    
    color_match = re.search(r"color[:\s]+([a-zA-Z]+)", user_message, re.IGNORECASE)
    if color_match:
        metadata["color"] = color_match.group(1).strip()
    
    fabric_match = re.search(r"fabric[:\s]+([a-zA-Z]+)", user_message, re.IGNORECASE)
    if fabric_match:
        metadata["fabric"] = fabric_match.group(1).strip()
    
    model_match = re.search(r"model[:\s]+([a-zA-Z0-9\s]+?)(?:\s|$|\.|\,)", user_message, re.IGNORECASE)
    if model_match:
        metadata["model"] = model_match.group(1).strip()
    
    return metadata