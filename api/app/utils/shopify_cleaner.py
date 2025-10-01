import json
from typing import Dict, Any, List, Set

from app.models.api.shopify import ShopifyProduct, ShopifyCollection

def _extract_gids_from_metafield(metafield_node: Dict[str, Any]) -> List[str]:
    """Extracts a list of GIDs from a metaobject reference list metafield"""
    field_type = metafield_node.get("type", "")
    if "list" in field_type and "metaobject_reference" in field_type:
        try:
            return json.loads(metafield_node.get("value", "[]"))
        except (json.JSONDecodeError, TypeError):
            return []
    return []

def extract_all_metaobject_gids(product_edges: List[Dict[str, Any]]) -> Set[str]:
    """Iterates through all products and their variants to extract all unique metaobject GIDs from their metafields"""
    all_gids = set()
    for edge in product_edges:
        node = edge.get("node", {})

        for mf_edge in node.get("metafields", {}).get("edges", []):
            gids = _extract_gids_from_metafield(mf_edge.get('node', {}))
            all_gids.update(gids)
        
        for variant_edge in node.get("variants", {}).get("edges", []):
            variant = variant_edge.get("node", {})
            for mf_edge in variant.get("metafields", {}).get("edges", []):
                gids = _extract_gids_from_metafield(mf_edge.get('node', {}))
                all_gids.update(gids)
    return all_gids

def _get_metafield_value(mf_node: Dict[str, Any], metaobject_names: Dict[str, str]) -> str:
    """Gets the value of a metafield, resolving metaobject references to their display names"""
    gids = _extract_gids_from_metafield(mf_node)
    if gids:
        return ", ".join([metaobject_names.get(gid, "") for gid in gids if gid in metaobject_names])
    return mf_node.get("value", "")

def _clean_product_edge(edge: Dict[str, Any], metaobject_names: Dict[str, str], shopify_store: str) -> List[ShopifyProduct]:
    """Cleans a single product edge, creating a ShopifyProduct for each variant"""
    node = edge.get("node", {})
    if not node:
        return []

    product_metafields = {
        f"{mf['node']['namespace']}.{mf['node']['key']}": _get_metafield_value(mf['node'], metaobject_names)
        for mf in node.get("metafields", {}).get("edges", []) if mf.get('node')
    }

    product_tags = node.get("tags", [])
    
    cleaned_products = []
    for variant_edge in node.get("variants", {}).get("edges", []):
        variant = variant_edge.get("node", {})
        if not variant:
            continue

        variant_metafields = {
            f"{mf['node']['namespace']}.{mf['node']['key']}": _get_metafield_value(mf['node'], metaobject_names)
            for mf in variant.get("metafields", {}).get("edges", []) if mf.get('node')
        }

        all_metafields = {**product_metafields, **variant_metafields}
        
        title = (
            node.get('title', 'Untitled')
            if variant.get('title', '').strip().lower() == "default title"
            else f"{node.get('title', 'Untitled')} - {variant.get('title')}"
        )
        
        image_url = "https://via.placeholder.com/150"
        media_edges = node.get("media", {}).get("edges", [])
        if media_edges:
            image_url = media_edges[0].get("node", {}).get("preview", {}).get("image", {}).get("url", image_url)

        cleaned_products.append(ShopifyProduct(
            id=node.get("id"),
            title=title,
            description=node.get("description") or "No description available",
            category=node.get("category", {}).get("name", "Uncategorized"),
            handle=node.get("handle"),
            url=node.get("onlineStorePreviewUrl") or f"https://{shopify_store}/products/{node.get('handle')}",
            price=variant.get("price", "0.00"),
            variant_id=variant.get("id"),
            variant_quantity=variant.get("inventoryQuantity"),
            tags=product_tags,
            image=image_url,
            metafields=all_metafields
        ))
    return cleaned_products

def _clean_collection_edge(edge: Dict[str, Any]) -> ShopifyCollection:
    """Cleans a single collection edge into a ShopifyCollection object"""
    node = edge.get("node", {})
    if not node:
        return None
        
    return ShopifyCollection(
        id=node.get("id"),
        title=node.get("title", "Untitled Collection"),
        products_count=node.get("productsCount", {}).get("count", 0),
        handle=node.get("handle")
    )

def clean_shopify_data(
    product_edges: List[Dict[str, Any]], 
    collection_edges: List[Dict[str, Any]], 
    metaobject_names: Dict[str, str],
    shopify_store: str
) -> Dict[str, Any]:
    """Cleans the raw product and collection data from Shopify into structured objects"""
    products = []
    for edge in product_edges:
        products.extend(_clean_product_edge(edge, metaobject_names, shopify_store))
        
    collections = []
    for edge in collection_edges:
        cleaned_collection = _clean_collection_edge(edge)
        if cleaned_collection:
            collections.append(cleaned_collection)

    return {
        "products": products,
        "collections": collections
    }