import re
import json
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse

from app.external_service.shopify_service import ShopifyService
from app.models.api.rag_pipeline import ProductEmbedding
from app.services.embeddings_service import EmbeddingService
from app.constants import TASK_STALLED_TIMEOUT_MINUTES
from app.utils.progress_tracker import ProgressTracker
from app.utils.logger import logger

async def get_products_from_admin(shopify_service: ShopifyService):
    shopify_data = await shopify_service.fetch_products_and_collections()
    products = format_products(shopify_data)
    collections= format_collections(shopify_data)

    return products, collections

def format_products(shopify_data):
    """Formats raw product data from Shopify"""
    formatted_products = []
    for product in shopify_data["products"]:
        product.id = extract_shopify_id(product.id)

        if not getattr(product, "variant_id", None) and hasattr(product, "variants") and product.variants:
            product.variant_id = product.variants[0].id

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

async def create_product_embeddings(products: List, tracker: ProgressTracker) -> List[ProductEmbedding]:
    """Generates embeddings for a list of products"""
    embeddings = []
    total_products = len(products)
    if total_products == 0:
        return []

    for i, product in enumerate(products):
        normalize_product_fields_to_lowercase(product)

        standardized_metafields = normalize_and_clean_metafields(product.metafields)

        variant_quantity = getattr(product, 'variant_quantity', 0)

        metadata = {
            "title": product.title,
            "description": product.description,
            "category": product.category,
            "price": float(product.price) if isinstance(product.price, (str, Decimal)) and product.price.replace('.', '', 1).isdigit() else product.price,
            "url": product.url,
            "image": product.image,
            "variant_id": product.variant_id,
            "variant_quantity": variant_quantity,
            "type": "product"
        }
        metadata.update(standardized_metafields)

        metafields_str = " ".join([f"{key}: {value}" for key, value in product.metafields.items() if value])
        embedding_text = (
            f"Product: {product.title}. "
            f"Description: {product.description}. "
            f"Category: {product.category}. "
            f"Price: {product.price}. "
            f"Available stock: {variant_quantity}. "
            f"{metafields_str}"
        )
        
        embedding_values = EmbeddingService.create_embeddings(embedding_text)
        variant_id = extract_shopify_id(product.variant_id)

        embeddings.append(ProductEmbedding(
            id=variant_id,
            values=embedding_values,
            metadata=metadata
        ))

        await tracker.report_incremental_progress(
            step_name="GENERATE_EMBEDDINGS",
            current_item=i + 1,
            total_items=total_products,
            message_template="Training your data with AI... ({current}/{total})"
        )

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

async def cleanup_stale_task_before_start(redis_client, shop_id, stalled_threshold_minutes):
    lock_key = f"task_lock_{shop_id}"
    task_key_pattern = f"task_progress_{shop_id}_*"

    existing_lock = await redis_client.get(lock_key)
    if not existing_lock:
        return False

    async for key in redis_client.scan_iter(task_key_pattern):
        task_data_json = await redis_client.get(key)
        if not task_data_json:
            continue

        task_data = json.loads(task_data_json)
        updated_at_str = task_data.get("updated_at")
        status = task_data.get("status")

        if not updated_at_str or status != "processing":
            continue

        try: 
            updated_at = isoparse(updated_at_str)
            minutes_since_update = (datetime.now(timezone.utc) - updated_at).total_seconds() / 60

            if minutes_since_update > stalled_threshold_minutes:
                task_data.update({
                    "status": "failed",
                    "message": "Previous sync stalled. Auto-cleaned before retry.",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
                
                pipe = redis_client.pipeline()
                pipe.set(key, json.dumps(task_data))
                pipe.delete(lock_key)
                await pipe.execute()

                logger.info(f"Auto-cleaned stale task {task_data['task_id']} for shop {shop_id}.")
                return True
        except (ValueError, TypeError) as e:
            logger.error(f"Could not parse date for task key {key}: {e}")
            continue

    return False

def check_and_update_stalled_status(task_details: Dict[str, Any]) -> Dict[str, Any]:
    """Checks if a task appears stalled and updates the dictionary for reporting."""
    status = task_details.get("status")
    updated_at_str = task_details.get("updated_at")

    if status == "processing" and updated_at_str:
        try:
            updated_at = isoparse(updated_at_str)
            
            # if the time since the last update exceeds the threshold
            if datetime.now(timezone.utc) - updated_at > timedelta(minutes=TASK_STALLED_TIMEOUT_MINUTES):
                task_details["status"] = "failed"
                task_details["message"] = "Task timed out and appears to be stalled. Please try again."
                task_id = task_details.get("task_id")
                logger.warning(f"Reporting stalled status for task {task_id}.")

        except (ValueError, TypeError) as e:
            # If the date is malformed, we can't check it. Log it and return original details.
            task_id = task_details.get("task_id")
            logger.error(f"Could not parse timestamp for task {task_id}: {e}")
            
    return task_details