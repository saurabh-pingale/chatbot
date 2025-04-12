from typing import List
from app.external_service.shopify_service import ShopifyService
from app.models.api.rag_pipeline import ProductEmbedding
from app.services.embeddings_service import EmbeddingService
from app.utils.logger import logger

async def get_products_from_admin(shopify_store: str, shopify_access_token: str):
    """Fetches and formats products from Shopify admin"""
    logger.info(f"Recieived Shopify Store: {shopify_store}, Access Token: {shopify_access_token}")
    shopify_service = ShopifyService(shopify_store, shopify_access_token)
    shopify_data = await shopify_service.fetch_products_and_collections()
    products = format_products(shopify_data)
    collections= format_collections(shopify_data)

    return products, collections, shopify_data

def format_products(shopify_data):
    """Formats raw product data from Shopify"""
    return shopify_data["products"]


def format_collections(shopify_data):
    """Formats raw collection data from Shopify"""
    return shopify_data["collections"]


async def create_product_embeddings(products: List) -> List[ProductEmbedding]:
    """Generates embeddings for a list of products"""
    embeddings = []
    for product in products:
        embedding_text = f"Product: {product.title}. Description: {product.description}. Category: {product.category}. Price: {product.price}"
        embedding_values = EmbeddingService.create_embeddings(embedding_text)
        
        embeddings.append(ProductEmbedding(
            id=product.id,
            values=embedding_values,
            metadata={
                "title": product.title,
                "description": product.description,
                "category": product.category,
                "price": product.price,
                "url": product.url,
                "image": product.image,
                "variant_id": product.variant_id,
                "type": "product"
            }
        ))
    return embeddings