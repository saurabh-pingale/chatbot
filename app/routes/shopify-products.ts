import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";

const PRODUCT_QUERY = `#graphql
  query shopProducts($first: Int!) {
    shop { currencyCode }
    products(first: $first) {
      nodes {
        id
        title
        description
        handle
        onlineStoreUrl
        featuredImage { url }
        productType
        collections(first: 1) {
          nodes { title }
        }
        category {
          id
          name
          fullName
        }
        variants(first: 1) {
          nodes {
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

export async function action({ request }: any) {
  try {
    const { session } = await authenticate.admin(request);

    const shopId = getShopId(session);

    if (!shopId) {
      return new Response(JSON.stringify({ message: "Shop not found." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(PRODUCT_QUERY, {
      variables: { first: 250 },
    });

    const responseJson = await response.json();


    console.log({
    shop: session.shop,
    hasToken: !!session.accessToken,
    tokenLength: session.accessToken?.length,
  });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          message: "Shopify API failed",
          status: response.status,
          errors: "",
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const nodes = responseJson?.data?.products?.nodes ?? [];
    const currency = responseJson?.data?.shop?.currencyCode ?? "USD";

    const products = nodes.map((product: any) => {
      const variant = product.variants?.nodes?.[0] ?? {};

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        onlineStoreUrl:
          product.onlineStoreUrl ??
          `https://${shopId}/products/${product.handle}`,
        featuredImageUrl: product.featuredImage?.url ?? null,
        productType: product.productType ?? null,
        category:
          product.collections?.nodes?.[0]?.title ??
          (product.category?.name === "Uncategorized"
            ? "Other"
            : product.category?.name ?? "Other"),
        price: variant.price ?? 0,
        currencyCode: currency,
        variantQuantity: variant.inventoryQuantity ?? 0,
      };
    });

    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Shopify product fetch failed:", error);

    return new Response(
      JSON.stringify({
        message: error?.message ?? "Failed to fetch products.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}