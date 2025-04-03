import httpx
from typing import Dict, Any
from app.models.api.shopify import ShopifyProduct, ShopifyCollection
from app.utils.logger import logger

class ShopifyService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_store = shopify_store
        self.shopify_access_token = shopify_access_token

    async def fetch_products_and_collections(self) -> Dict[str, Any]:
        """Fetch products and collections from Shopify store using GraphQL API"""
        query = """
        query {
            products(first: 250) {
                edges {
                    node {
                        id
                        title
                        description
                        category {
                            name
                        }
                        handle
                        onlineStorePreviewUrl
                        variants(first: 1) {
                            edges {
                                node {
                                    price
                                    id
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
            }
            collections(first: 250) {
                edges {
                    node {
                        id
                        title
                        productsCount {
                            count
                        }
                        handle
                    }
                }
            }
        }
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://{self.shopify_store}/admin/api/2023-10/graphql.json",
                    headers={
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": self.shopify_access_token,
                    },
                    json={"query": query}
                )

                response.raise_for_status()
                data = response.json()

                products = []
                for edge in data["data"]["products"]["edges"]:
                    node = edge["node"]
                    variant = node["variants"]["edges"][0]["node"] if node["variants"]["edges"] else None

                    products.append(ShopifyProduct(
                        id=node["id"],
                        title=node["title"],
                        description=node.get("description") or "No description available",
                        category=node.get("category", {}).get("name", ""),
                        handle=node["handle"],
                        url=node.get("onlineStorePreviewUrl") or f"https://{self.shopify_store}/products/{node['handle']}",
                        price=variant["price"] if variant else "0.00",
                        variant_id=variant["id"] if variant else "",  
                        image=node["media"]["edges"][0]["node"]["preview"]["image"]["url"] if node["media"]["edges"] else "https://via.placeholder.com/150"
                    ))

                collections = []
                for edge in data["data"]["collections"]["edges"]:
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