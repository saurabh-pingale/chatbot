import re
from typing import List, Dict, Any

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
        f"Product: Title: {result.metadata.title}, Description: {result.metadata.description}, "
        f"Category: {result.metadata.category}, Price: {result.metadata.price}."
        for result in query_results
        if result and result.metadata
    )

def extract_categories(transformed_products):
    return list({str(p.get("category", "")) for p in transformed_products if p.get("category")})

def extract_essential_filters(user_message: str) -> Dict[str, Any]:
    """Extract only price range filters that require structured filtering."""
    filters = {}
    lower_message = user_message.lower()
    
    # Extract only price information
    price_patterns = [
        # Less than/under patterns
        (r'(?:under|less than|below|not more than|cheaper than|at most)\s*\$?(\d+(?:\.\d+)?)', "max_price", 1),
        # Greater than/over patterns
        (r'(?:over|more than|above|at least|higher than|minimum|starting at|from)\s*\$?(\d+(?:\.\d+)?)', "min_price", 1),
        # Price range patterns
        (r'\$?(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?(\d+(?:\.\d+)?)', ["min_price", "max_price"], [1, 2]),
        (r'between\s*\$?(\d+(?:\.\d+)?)\s*and\s*\$?(\d+(?:\.\d+)?)', ["min_price", "max_price"], [1, 2]),
        # Exact price patterns
        (r'(?:price|cost)(?:\s+is|\s*:\s*)\s*\$?(\d+(?:\.\d+)?)', "exact_price", 1),
        (r'(?:exactly|precisely|just)\s*\$?(\d+(?:\.\d+)?)', "exact_price", 1)
    ]
    
    for pattern, key, group in price_patterns:
        match = re.search(pattern, lower_message)
        if match:
            if isinstance(key, list):
                # Handle multiple capture groups (like price ranges)
                for i, k in enumerate(key):
                    filters[k] = float(match.group(group[i]))
            else:
                # Handle single capture group
                filters[key] = float(match.group(group))
    
    # Convert exact price to a narrow range if specified
    if "exact_price" in filters:
        exact = filters.pop("exact_price")
        filters["min_price"] = exact * 0.95  # 5% tolerance
        filters["max_price"] = exact * 1.05  # 5% tolerance
    
    return filters