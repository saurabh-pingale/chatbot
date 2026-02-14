from typing import Dict, Any, List, Set

from app.external_service.graphql_client import execute_graphql_query
from app.constants import SHOPIFY_GRAPHQL_URL
from app.models.api.shopify import ShopifyProduct, ShopifyCollection
from app.utils.logger import logger


class ShopifyService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_store = shopify_store
        self.shopify_access_token = shopify_access_token

    async def _fetch_metaobject_display_names(self, gids: Set[str]) -> Dict[str, str]:
        if not gids:
            return {}

        query = """
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
                query=query,
                variables={"ids": list(gids)},
                access_token=self.shopify_access_token
            )
            data = data or {}

            return {
                node["id"]: node["displayName"]
                for node in data.get("data", {}).get("nodes", [])
                if node and node.get("displayName")
            }

        except Exception as e:
            logger.error(f"Metaobject fetch error: {e}")
            return {}

    async def fetch_products_and_collections(self) -> Dict[str, Any]:
        query = """
        query($first: Int!, $afterProducts: String, $afterCollections: String) {
          products(
            first: $first,
            after: $afterProducts,
            query: "status:active AND published_status:published AND inventory_total:>0"
          ) {
            nodes {
              id
              title
              description
              tags
              handle
              onlineStoreUrl
              category {
                name
              }
              collections(first: 50) {
                nodes {
                  title
                }
              }
              metafields(first: 20) {
                nodes {
                  namespace
                  key
                  value
                  type
                }
              }
              variants(first: 10) {
                nodes {
                  id
                  title
                  price
                  inventoryQuantity
                  metafields(first: 20) {
                    nodes {
                      namespace
                      key
                      value
                      type
                    }
                  }
                }
              }
              media(first: 1) {
                nodes {
                  preview {
                    image {
                      url
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }

          collections(first: $first, after: $afterCollections) {
            nodes {
              id
              title
              handle
              productsCount {
                count
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        """

        try:
            url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)

            all_products = []
            all_collections = []

            after_products = None
            after_collections = None

            while True:
                variables = {
                    "first": 250,
                    "afterProducts": after_products,
                    "afterCollections": after_collections
                }

                data = await execute_graphql_query(
                    url=url,
                    query=query,
                    variables=variables,
                    access_token=self.shopify_access_token
                )

                data = (data or {}).get("data", {})
                if not data:
                    raise ValueError("Invalid Shopify response")

                products = data.get("products") or {}
                collections = data.get("collections") or {}
  
                product_nodes = products.get("nodes") or []
                collection_nodes = collections.get("nodes") or []

                all_products.extend(product_nodes)
                all_collections.extend(collection_nodes)

                page_info_products = products.get("pageInfo") or {}
                page_info_collections = collections.get("pageInfo") or {}

                if page_info_products.get("hasNextPage"):
                    after_products = page_info_products.get("endCursor")

                if page_info_collections.get("hasNextPage"):
                    after_collections = page_info_collections.get("endCursor")

                if not page_info_products.get("hasNextPage") and not page_info_collections.get("hasNextPage"):
                    break

            product_models: List[ShopifyProduct] = []

            for product in all_products:
                # extracting first media image URL from nested GraphQL structure
                image_url = ""
                if product.get("media", {}).get("nodes"):
                    image_url = (
                        product["media"]["nodes"][0]
                        .get("preview", {})
                        .get("image", {})
                        .get("url", "")
                    )

                # flattening collection nodes into list of titles
                collections_titles = [
                    c.get("title")
                    for c in product.get("collections", {}).get("nodes", []) or []
                    if c.get("title")
                ]

                # converting metafield nodes into namespace.key dictionary
                product_metafields = {
                    f"{mf.get('namespace')}.{mf.get('key')}": mf.get("value")
                    for mf in product.get("metafields", {}).get("nodes", []) or []
                    if mf.get("namespace") and mf.get("key")
                }

                for variant in product.get("variants", {}).get("nodes", []) or []:
                    if (variant.get("inventoryQuantity") or 0) <= 0:
                        continue

                    # merging variant metafields into flattened structure
                    variant_metafields = {
                        f"{mf.get('namespace')}.{mf.get('key')}": mf.get("value")
                        for mf in variant.get("metafields", {}).get("nodes", []) or []
                        if mf.get("namespace") and mf.get("key")
                    }

                    handle = product.get("handle") or ""
                    url = product.get("onlineStoreUrl") or (
                        f"https://{self.shopify_store}/products/{handle}" if handle else ""
                    )

                    product_models.append(
                        ShopifyProduct(
                            id=product.get("id"),
                            title=product.get("title"),
                            description=product.get("description") or "No description available",
                            category=(product.get("category") or {}).get("name", "Uncategorized"),
                            collections=collections_titles,
                            handle=handle,
                            url=url,
                            price=variant.get("price") or "0.00",
                            image=image_url,
                            variant_id=variant.get("id"),
                            metafields={**product_metafields, **variant_metafields},
                            tags=product.get("tags") or [],
                            variant_quantity=variant.get("inventoryQuantity") or 0
                        )
                    )

            collection_models = [
                ShopifyCollection(
                    id=c.get("id"),
                    title=c.get("title"),
                    products_count=(c.get("productsCount") or {}).get("count", 0),
                    handle=c.get("handle"),
                )
                for c in all_collections
            ]

            return {
                "products": product_models,
                "collections": collection_models
            }

        except Exception as e:
            logger.error(f"Error fetching Shopify data: {e}")
            raise ValueError("Failed to fetch products from Shopify")

    async def fetch_variant_inventory(self, variant_id: int) -> int:
        variant_gid = f"gid://shopify/ProductVariant/{variant_id}"

        query = """
        query getVariantInventory($id: ID!) {
          node(id: $id) {
            ... on ProductVariant {
              inventoryQuantity
            }
          }
        }
        """

        try:
            url = SHOPIFY_GRAPHQL_URL.format(shop=self.shopify_store)

            data = await execute_graphql_query(
                url=url,
                query=query,
                variables={"id": variant_gid},
                access_token=self.shopify_access_token
            )

            data = data or {}
            node = data.get("data", {}).get("node")
            if not node:
                return 0
            return node.get("inventoryQuantity", 0)

        except Exception as e:
            logger.error(f"Inventory fetch error: {e}")
            raise ValueError("Failed to fetch inventory from Shopify")