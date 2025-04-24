import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const { forwardRequestToBackend } = await import("../api.server");

  const shopDomain = url.searchParams.get('shop');
  const userId = url.searchParams.get('user_id');

  let forwardUrl = '/agent_conversation_router/agent_conversation';
  const params = new URLSearchParams();

  if (shopDomain) params.set('shopId', shopDomain);
  if (userId) params.set('user_id', userId);

  if (params.toString()) {
    forwardUrl += `?${params.toString()}`;
  }

  return forwardRequestToBackend(forwardUrl, request);
}