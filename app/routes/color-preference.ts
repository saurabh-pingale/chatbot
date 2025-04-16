import type { LoaderFunctionArgs } from "@remix-run/node";
import { forwardRequestToBackend } from "./api.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return forwardRequestToBackend(`/store-admin/color-preference${url.search}`, request);
}