import { API } from "../constants/api.constants";

export async function fetchProducts(
  shop: string
): Promise<{ task_id: string }> {
    const response = await fetch(`${API.CREATE_PRODUCTS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Store": shop
      },
      body: JSON.stringify({ namespace: shop }),
    });
  
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }
  
    return response.json();
  }