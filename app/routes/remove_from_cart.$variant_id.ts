import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request, params }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");
  
  const url = new URL(request.url);
  const shop_id = url.searchParams.get("shop_id");
  const guestId = url.searchParams.get("guest_id");
  const variant_id = params.variant_id;

  if (!variant_id || isNaN(Number(variant_id))) {
    return new Response(JSON.stringify({ detail: "Invalid variant_id" }), { status: 400 });
  }

  let forwardUrl = `/cart/items/${variant_id}`;
  const paramsObj = new URLSearchParams();

  if (shop_id) paramsObj.set("shop_id", shop_id);
  if (guestId) paramsObj.set("guest_id", guestId);

  if (paramsObj.toString()) {
    forwardUrl += `?${paramsObj.toString()}`;
  }

  const response = await forwardRequestToBackend(forwardUrl, request);
  const responseBody = await response.json();

  return new Response(JSON.stringify(responseBody), {
    status: response.status,
    headers: response.headers,
  });
}
