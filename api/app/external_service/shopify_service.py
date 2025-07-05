import httpx
import json
from typing import Dict, Any, List, Set
from app.models.api.shopify import ShopifyProduct, ShopifyCollection
from app.constants import SHOPIFY_GRAPHQL_URL
from app.utils.logger import logger

class ShopifyService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_store = shopify_store
        self.shopify_access_token = shopify_access_token

    async def _fetch_metaobject_display_names(self, gids: Set[str]) -> Dict[str, str]:
        """Fetch display names for a set of metaobject GIDs."""
        if not gids:
            return {}

        nodes_query = """
        query getMetaobjects($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on Metaobject {
                    id
                    displayName
                }
            }
        }
        """
        try:
            async with httpx.AsyncClient(verify=False) as client:
                url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)

                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": self.shopify_access_token,
                    },
                    json={"query": nodes_query, "variables": {"ids": list(gids)}}
                )
                response.raise_for_status()
                data = response.json()

                return {
                    node["id"]: node["displayName"]
                    for node in data.get("data", {}).get("nodes", [])
                    if node and "displayName" in node
                }
        except Exception as error:
            logger.error(f"Error fetching metaobjects from Shopify: {error}")
            return {}

    async def fetch_products_and_collections(self) -> Dict[str, Any]:
        """Fetch products and collections from Shopify store using GraphQL API"""
        #TODO: How we are defining first 250 ?, we need to discuss on it, 
        #TODO: create a seperate doc and list these hardcoded things also LRU cache one also add into that doc
        query = """
        query($first: Int!, $afterProducts: String, $afterCollections: String) {
            products(first: $first, after: $afterProducts) {
                edges {
                    cursor 
                    node {
                        id
                        title
                        description
                        category {
                            name
                        }
                        handle
                        onlineStorePreviewUrl
                        metafields(first: 20) {
                            edges {
                                node {
                                    key
                                    namespace
                                    value
                                    type
                                }
                            }
                        }
                        variants(first: 10) {
                            edges {
                                node {
                                    price
                                    id
                                    title
                                    metafields(first: 20) {
                                        edges {
                                            node {
                                                key
                                                namespace
                                                value
                                                type
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        media(first: 1) {
                            edges {
                                node {
                                    id
                                    preview {
                                        image {
                                            url
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                pageInfo { hasNextPage endCursor }
            }
            collections(first: $first, after: $afterCollections) {
                edges {
                    cursor 
                    node {
                        id
                        title
                        productsCount {
                            count
                        }
                        handle
                    }
                }
                pageInfo { hasNextPage endCursor }
            }
        }
        """
        
        try:
            async with httpx.AsyncClient(verify=False) as client:
                url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)
                #TODO: move all these graphql code and Call all these client.post or client.get in seperate graphql service
                
                all_product_edges = []
                all_collection_edges = []
                afterP = afterC = None

                while True:
                    variables = {
                        "first": 250,
                        "afterProducts": afterP,
                        "afterCollections": afterC
                    }

                    response = await client.post(
                        url,
                        headers={
                            "Content-Type": "application/json",
                            "X-Shopify-Access-Token": self.shopify_access_token,
                        },
                        json={"query": query, "variables": variables}
                    )

                    response.raise_for_status()
                    data = response.json()

                    prod = data["products"]
                    coll = data["collections"]

                    all_product_edges.extend(prod["edges"])
                    all_collection_edges.extend(coll["edges"])

                    afterP = prod["pageInfo"]["endCursor"] if prod["pageInfo"]["hasNextPage"] else afterP
                    afterC = coll["pageInfo"]["endCursor"] if coll["pageInfo"]["hasNextPage"] else afterC

                    if not prod["pageInfo"]["hasNextPage"] and not coll["pageInfo"]["hasNextPage"]:
                        break

                all_metaobject_gids = set()
                
                def extract_gids_from_metafield(mf_node) -> List[str]:
                    if "list" in mf_node.get("type", "") and "metaobject_reference" in mf_node.get("type", ""):
                        try:
                            return json.loads(mf_node.get("value", "[]"))
                        except (json.JSONDecodeError, TypeError):
                            return []
                    return []

                #TODO: Move all cleaning things into seperate fuctions
                for edge in all_product_edges:
                    node = edge["node"]
                    for mf_edge in node["metafields"]["edges"]:
                        gids = extract_gids_from_metafield(mf_edge['node'])
                        all_metaobject_gids.update(gids)
                    
                    for variant_edge in node["variants"]["edges"]:
                        variant = variant_edge["node"]
                        for mf_edge in variant["metafields"]["edges"]:
                            gids = extract_gids_from_metafield(mf_edge['node'])
                            all_metaobject_gids.update(gids)

                metaobject_names = await self._fetch_metaobject_display_names(all_metaobject_gids)

                def get_metafield_value(mf_node):
                    gids = extract_gids_from_metafield(mf_node)
                    if gids:
                        return ", ".join([metaobject_names.get(gid, "") for gid in gids if gid in metaobject_names])
                    return mf_node.get("value", "")

                products = []
                for edge in all_product_edges   :
                    node = edge["node"]
                    
                    product_metafields = {
                        f"{mf['node']['namespace']}.{mf['node']['key']}": get_metafield_value(mf['node'])
                        for mf in node["metafields"]["edges"]
                    }
                    
                    for variant_edge in node["variants"]["edges"]:
                        variant = variant_edge["node"]
                        
                        variant_metafields = {
                            f"{mf['node']['namespace']}.{mf['node']['key']}": get_metafield_value(mf['node'])
                            for mf in variant["metafields"]["edges"]
                        }
                        
                        all_metafields = {**product_metafields, **variant_metafields}

                        products.append(ShopifyProduct(
                            id=node["id"],
                            title=(
                                node['title']
                                if variant['title'].strip().lower() == "default title"
                                else f"{node['title']} - {variant['title']}"
                            ),
                            description=node.get("description") or "No description available",
                            category=node.get("category", {}).get("name", ""),
                            handle=node["handle"],
                            url=node.get("onlineStorePreviewUrl") or f"https://{self.shopify_store}/products/{node['handle']}",
                            price=variant["price"] if variant else "0.00",
                            variant_id=variant["id"] if variant else "",  
                            image=node["media"]["edges"][0]["node"]["preview"]["image"]["url"] 
                                if node["media"]["edges"] else "https://via.placeholder.com/150",
                            metafields=all_metafields
                        ))

                collections = []
                for edge in all_collection_edges:
                    node = edge["node"]
                    collections.append(ShopifyCollection(
                        id=node["id"],
                        title=node["title"],
                        products_count=node["productsCount"]["count"],
                        handle=node["handle"]
                    ))

                return {
                    "products": products,
                    "collections": collections
                }

        except Exception as error:
            logger.error(f"Error fetching products from Shopify: {error}")
            raise ValueError("Failed to fetch products from Shopify")