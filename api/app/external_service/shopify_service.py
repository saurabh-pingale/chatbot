from typing import Dict, Any, Set

from app.external_service.graphql_client import execute_graphql_query
from app.constants import SHOPIFY_GRAPHQL_URL
from app.utils.shopify_cleaner import extract_all_metaobject_gids, clean_shopify_data
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
            url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)
            data = await execute_graphql_query(
                url=url,
                query=nodes_query,
                variables={"ids": list(gids)},
                access_token=self.shopify_access_token
            )

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
            url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)
          
            all_product_edges = []
            all_collection_edges = []
            afterP = afterC = None
            while True:
                variables = {
                    "first": 250,
                    "afterProducts": afterP,
                    "afterCollections": afterC
                }
                data = await execute_graphql_query(
                    url=url,
                    query=query,
                    variables=variables,
                    access_token=self.shopify_access_token
                )
                data = data.get("data", {})
                prod = data.get("products", {})
                coll = data.get("collections", {})
                all_product_edges.extend(prod["edges"])
                all_collection_edges.extend(coll["edges"])
                afterP = prod["pageInfo"]["endCursor"] if prod["pageInfo"]["hasNextPage"] else afterP
                afterC = coll["pageInfo"]["endCursor"] if coll["pageInfo"]["hasNextPage"] else afterC
                if not prod["pageInfo"]["hasNextPage"] and not coll["pageInfo"]["hasNextPage"]:
                    break
            all_metaobject_gids = extract_all_metaobject_gids(all_product_edges)
            metaobject_names = await self._fetch_metaobject_display_names(all_metaobject_gids)
            return clean_shopify_data(
                product_edges=all_product_edges,
                collection_edges=all_collection_edges,
                metaobject_names=metaobject_names,
                shopify_store=self.shopify_store
            )
        except Exception as error:
            logger.error(f"Error fetching products from Shopify: {error}")
            raise ValueError("Failed to fetch products from Shopify")