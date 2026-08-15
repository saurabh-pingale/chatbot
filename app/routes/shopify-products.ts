import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";

const PRODUCT_QUERY = `#graphql
  query shopProducts($first: Int!) {
    shop {
      currencyCode
    }
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          onlineStoreUrl
          handle
          featuredImage {
            url
          }

          productType

          collections(first: 1) {
            edges {
              node {
                title
              }
            }
          }

          category {
            id
            name
            fullName
          }

          variants(first: 1) {
            edges {
              node {
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = getShopId(session);
  const shopify_store = shopId;

  if (!shopId) {
    return new Response(JSON.stringify({ message: "Shop not found." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(PRODUCT_QUERY, {
      variables: { first: 250 },
    });
    const json = await response.json();

    if (!json?.data?.products?.edges) {
      throw new Error("Invalid Shopify response");
    }
    const currency = json?.data?.shop?.currencyCode ?? "USD";
    const products = json.data.products.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      description: edge.node.description,
      onlineStoreUrl: edge.node.onlineStoreUrl ?? `https://${shopify_store}/products/${edge.node.handle}`,
      featuredImageUrl: edge.node.featuredImage?.url ?? null,
      productType: edge.node.productType ?? null,
      category: edge.node.collections?.edges?.[0]?.node?.title ?? 
                (edge.node.category?.name === "Uncategorized" ? "Other" : edge.node.category?.name ?? "Other"),
      price: edge.node.variants?.edges?.[0]?.node?.price ?? 0.0,
      currencyCode: currency,
      variantQuantity:
        edge.node.variants?.edges?.[0]?.node?.inventoryQuantity ?? 0,
    }));

    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Shopify product fetch failed:", error);
    return new Response(
      JSON.stringify({ message: error?.message ?? "Failed to fetch products." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
