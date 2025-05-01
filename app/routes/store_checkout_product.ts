import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const { forwardRequestToBackend } = await import("../api.server");

  const shopDomain = url.searchParams.get('shop');
  const userId = url.searchParams.get('user_id');

  let forwardUrl = '/checkout_product/user-checkout';
  const params = new URLSearchParams();

  if (shopDomain) params.set('store_name', shopDomain);
  if (userId) params.set('user_email', userId);

  if (params.toString()) {
    forwardUrl += `?${params.toString()}`;
  }
  
  return forwardRequestToBackend(forwardUrl, request);
}