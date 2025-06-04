from typing import List, Dict, Any

def extract_products_from_response(query_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts and filters products from query results."""
    products = []
    for result in query_results:
        if result and hasattr(result, 'metadata') and result.metadata:
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

def extract_categories(transformed_products):
    return list({str(p.get("category", "")) for p in transformed_products if p.get("category")})