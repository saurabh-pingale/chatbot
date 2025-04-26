import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");

  let forwardUrl = '/checkout_product_router/remove-checkout-product';
  
  return forwardRequestToBackend(forwardUrl, request);
}