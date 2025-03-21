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
    return data.data.products.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      description: edge.node.description,
      url: edge.node.url || `https://${shopifyStore}/products/${edge.node.handle}`,
      price: edge.node.variants.edges[0]?.node.price,
      image: edge.node.images.edges[0]?.node.src,
    }));
  } catch(error) {
    console.error(error);
    throw new Error("Failed to fetch products from Shopify");
  }
};