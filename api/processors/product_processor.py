from services.shopify.fetch_products import fetch_shopify_products
from services.elasticsearch.product_service import ElasticSearchService
from typing import List, Dict, Any

async def process_products(shopify_store: str, shopify_access_token: str) -> List[Dict[str, Any]]:
    try:
        es_service = ElasticSearchService()
        products = await fetch_shopify_products(shopify_store, shopify_access_token)

        es_products = [
            {
                "id": product.id.split("/")[-1],  
                "title": product.title,
                "body_html": product.description or "",
                "handle": product.url.split("/")[-1] if product.url else "", 
                "image": {"src": product.image},
                "shop_id": shopify_store
            }
            for product in products
        ]

        await es_service.index_products(es_products)
        return [product.dict() for product in products]
    except Exception as error:
        print(f"Error processing products: {error}")
        raise ValueError("Failed to process products")