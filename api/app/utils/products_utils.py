import re
from typing import List
from decimal import Decimal

from app.external_service.shopify_service import ShopifyService
from app.models.api.rag_pipeline import ProductEmbedding
from app.services.embeddings_service import EmbeddingService

async def get_products_from_admin(shopify_store: str, shopify_access_token: str):
    shopify_service = ShopifyService(shopify_store, shopify_access_token)
    shopify_data = await shopify_service.fetch_products_and_collections()
    products = format_products(shopify_data)
    collections= format_collections(shopify_data)

    return products, collections

def format_products(shopify_data):
    """Formats raw product data from Shopify"""
    formatted_products = []
    for product in shopify_data["products"]:
        product.id = extract_shopify_id(product.id)
        formatted_products.append(product)
    return formatted_products

def extract_shopify_id(gid: str) -> int:
    """
    Extracts the numeric Shopify ID from a Global ID (GID) string.
    Example: gid://shopify/Product/123456789 -> 123456789
    Raises ValueError if the format is invalid.
    """
    shopify_id_pattern = r"/(\d+)$"  # Matches digits at the end of the string after a slash
    match = re.search(shopify_id_pattern, gid)
    
    if not match:
        raise ValueError(f"Invalid Shopify GID format: {gid}")
    
    return int(match.group(1))

def format_collections(shopify_data):
    """Formats raw collection data from Shopify"""
    return shopify_data["collections"]

async def create_product_embeddings(products: List) -> List[ProductEmbedding]:
    """Generates embeddings for a list of products"""
    embeddings = []

    for product in products:
        normalize_product_fields_to_lowercase(product)

        standardized_metafields = normalize_and_clean_metafields(product.metafields)

        metadata = {
            "title": product.title,
            "description": product.description,
            "category": product.category,
            "price": float(product.price) if isinstance(product.price, (str, Decimal)) and product.price.replace('.', '', 1).isdigit() else product.price,
            "url": product.url,
            "image": product.image,
            "variant_id": product.variant_id,
            "type": "product"
        }
        metadata.update(standardized_metafields)

        metafields_str = " ".join([f"{key}: {value}" for key, value in product.metafields.items() if value])
        embedding_text = f"Product: {product.title}. Description: {product.description}. Category: {product.category}. Price: {product.price}. {metafields_str}"
        
        embedding_values = EmbeddingService.create_embeddings(embedding_text)
        variant_id = extract_shopify_id(product.variant_id)

        embeddings.append(ProductEmbedding(
            id=variant_id,
            values=embedding_values,
            metadata=metadata
        ))
    return embeddings

def normalize_product_fields_to_lowercase(product):
    """Converts all string fields of the product and its metafields to lowercase."""
    if isinstance(product.title, str):
        product.title = product.title.lower()
    if isinstance(product.description, str):
        product.description = product.description.lower()
    if isinstance(product.category, str):
        product.category = product.category.lower()
    if isinstance(product.price, str):
        product.price = product.price.lower()
    if isinstance(product.variant_id, str):
        product.variant_id = product.variant_id.lower()

    if hasattr(product, "metafields") and isinstance(product.metafields, dict):
        product.metafields = {
            key: value.lower() if isinstance(value, str) else value
            for key, value in product.metafields.items()
        }

def normalize_and_clean_metafields(metafields: dict) -> dict:
    """ Cleans and standardizes metafield keys and lowercases string values. """
    if not isinstance(metafields, dict):
        return {}

    KEY_MAPPING = {
        "shopify.color-pattern": "color",
        "shopify.size": "size",
        "shopify.fabric": "fabric",
        "shopify.neckline": "neckline",
        "shopify.target-gender": "gender",
        "shopify.age-group": "age_group",
        "shopify.sleeve-length-type": "sleeve_length",
        "shopify.top-length-type": "length",
        "shopify.clothing-features": "features"
    }
    
    cleaned_metafields = {}
    for key, value in metafields.items():
        simple_key = KEY_MAPPING.get(key, key.replace("shopify.", "")).lower()

        processed_value = value.lower() if isinstance(value, str) else value
        
        cleaned_metafields[simple_key] = processed_value
        
    return cleaned_metafields