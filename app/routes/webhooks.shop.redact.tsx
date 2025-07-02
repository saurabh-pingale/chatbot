import type { ActionFunctionArgs } from "@remix-run/node";
import { isValidShopifyWebhook } from "../utils/verify-webhook";

export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.SHOPIFY_API_SECRET || "";

  const rawBody = await request.text();

  if (!isValidShopifyWebhook(request, rawBody, secret)) {
    console.error("Invalid HMAC for /webhooks/shop/redact");
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("Valid shop redact webhook:", rawBody);
  return new Response("OK", { status: 200 });
}