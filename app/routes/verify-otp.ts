import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");

  return forwardRequestToBackend('/user_auth/verify-otp', request);
}