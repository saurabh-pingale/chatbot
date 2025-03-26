import os
import httpx
from typing import List
from schemas.models import ShopifyProduct

async def fetch_shopify_products(shopify_store: str, shopify_access_token: str) -> List[ShopifyProduct]:
    query = """
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            description
            handle
            onlineStoreUrl
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  src
                }
              }
            }  
          }
        }
      }
    }
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{shopify_store}/admin/api/2023-10/graphql.json",
                headers={
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": shopify_access_token,
                },
                json={"query": query}
            )

            response.raise_for_status()
            data = response.json()

            products = []
            for edge in data["data"]["products"]["edges"]:
                node = edge["node"]
                products.append(ShopifyProduct(
                    id=node["id"],
                    title=node["title"],
                    description=node.get("description") or "No description available",
                    url=node.get("onlineStoreUrl") or f"https://{shopify_store}/products/{node['handle']}",
                    price=node["variants"]["edges"][0]["node"]["price"] if node["variants"]["edges"] else "Price not available",
                    image=node["images"]["edges"][0]["node"]["src"] if node["images"]["edges"] else "https://via.placeholder.com/150"
                ))

            return products
    except Exception as error:
        print(f"Error fetching products: {error}")
        raise ValueError("Failed to fetch products from Shopify")