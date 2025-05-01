import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { forwardRequestToBackend } = await import("../api.server");

  let forwardUrl = '/checkout_product/user-checkout';
  
  return forwardRequestToBackend(forwardUrl, request);
}