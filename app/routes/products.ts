import { API } from "app/constants/api.constants";
export async function fetchProducts(shop: string, accessToken: string): Promise<{ message: string }> {
    const response = await fetch(`${API.CREATE_PRODUCTS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Store": shop,
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ namespace: shop }),
    });
  
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }
  
    return response.json();
  }