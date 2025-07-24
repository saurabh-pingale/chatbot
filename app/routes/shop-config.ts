import type { LoaderFunctionArgs } from "@remix-run/node";
import { API } from "../constants/api.constants";

export async function loader({ request }: LoaderFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");
  const url = new URL(request.url);

  const shopIdRaw = url.searchParams.get("shop_id");

  const cleanShopId = shopIdRaw?.split("?")[0];

  if (!cleanShopId) {
    return new Response(JSON.stringify({ error: "Missing shop_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const searchParams = new URLSearchParams({ shop_id: cleanShopId });
  const pathWithParams = `${new URL(API.SHOP_CONFIG).pathname}?${searchParams.toString()}`;

  return forwardRequestToBackend(pathWithParams, request);
}