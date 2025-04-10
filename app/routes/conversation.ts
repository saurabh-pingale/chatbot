import type { ActionFunctionArgs } from "@remix-run/node";
import { forwardRequestToBackend } from "./api.server";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');

  let forwardUrl = '/conversation-router/conversation';
  if (shopDomain) {
    forwardUrl += `?shopId=${encodeURIComponent(shopDomain)}`;
  }

  return forwardRequestToBackend(forwardUrl, request);
}