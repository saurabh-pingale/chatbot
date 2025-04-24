import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const { forwardRequestToBackend } = await import("../api.server");

  const shopDomain = url.searchParams.get('shop');
  const userId = url.searchParams.get('user_id');

  console.log("------------------Triggering 1 ---------------------------------");
  let forwardUrl = '/agent_conversation_router/agent_conversation';
  const params = new URLSearchParams();

  if (shopDomain) params.set('shopId', shopDomain);
  if (userId) params.set('user_id', userId);

  if (params.toString()) {
    forwardUrl += `?${params.toString()}`;
  }
  console.log("------------------Triggering 2 ---------------------------------");
  return forwardRequestToBackend(forwardUrl, request);
}