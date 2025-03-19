import { json } from "@remix-run/node";
import { ShopifyProduct } from "../../types";

export const fetchShopifyProducts = async (shopifyStore: string, shopifyAccessToken: string): Promise<ShopifyProduct[]> => {
  const query = `
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            description
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shopifyStore}/admin/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyAccessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return json({ error: "Failed to fetch products" }, { status: 500 });
    }

    const data = await response.json();
    return data.data.products.edges.map((edge: any) => edge.node);
  } catch(error) {
    console.error(error);
    throw new Error("Failed to fetch products from Shopify");
  }
};