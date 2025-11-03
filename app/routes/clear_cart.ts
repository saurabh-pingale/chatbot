import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const { forwardRequestToBackend } = await import("../api.server");

  const shop_id = url.searchParams.get('shop_id');
  const guestId = url.searchParams.get('guest_id');

  let forwardUrl = '/cart/clear';
  const params = new URLSearchParams();

  if (shop_id) params.set('shop_id', shop_id);
  if (guestId) params.set('guest_id', guestId);

  if (params.toString()) {
    forwardUrl += `?${params.toString()}`;
  }
  
  const response = await forwardRequestToBackend(forwardUrl, request);

  const refreshedToken = response.headers.get("x-token-refreshed")

  const responseBody = await response.json();

  const headers = new Headers(response.headers);
  if (refreshedToken) {
    headers.set("x-token-refreshed", refreshedToken);
  }
  
  return new Response(JSON.stringify(responseBody), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}