import type { ActionFunctionArgs } from "@remix-run/node";
import { forwardRequestToBackend } from "./api.server";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');

  let forwardUrl = '/agent_conversation_router/agent_conversation';
  if (shopDomain) {
    forwardUrl += `?shopId=${encodeURIComponent(shopDomain)}`;
  }

  return forwardRequestToBackend(forwardUrl, request);
}