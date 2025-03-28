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
              category {
                name
              }
              handle
              onlineStorePreviewUrl
              variants(first: 1) {
                edges {
                  node {
                    price
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

                image_url = ""
                if node["media"]["edges"]:
                    image_url = node["media"]["edges"][0]["node"]["preview"]["image"]["url"]

                products.append(ShopifyProduct(
                    id=node["id"],
                    title=node["title"],
                    description=node.get("description", ""),
                    category=node["category"]["name"] if node.get("category") else None,
                    url=node.get("onlineStorePreviewUrl"),
                    price=node["variants"]["edges"][0]["node"]["price"],
                    image=image_url
                ))

            return products
    except Exception as error:
        print(f"Error fetching products: {error}")
        raise ValueError("Failed to fetch products from Shopify")