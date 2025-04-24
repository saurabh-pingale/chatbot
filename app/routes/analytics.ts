import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");

  return forwardRequestToBackend('/analytics_router/analytics', request);
}