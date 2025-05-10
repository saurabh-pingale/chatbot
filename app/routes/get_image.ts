import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { forwardRequestToBackend } = await import("../api.server");

  return forwardRequestToBackend(`/shop-admin/get-image${url.search}`, request);
}