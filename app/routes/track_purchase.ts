import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");
  
  const response = await forwardRequestToBackend('/analytics_router/track_purchase', request);

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

