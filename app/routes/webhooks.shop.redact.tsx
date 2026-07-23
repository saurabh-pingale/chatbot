import type { ActionFunctionArgs } from "@remix-run/node";
import { isValidShopifyWebhook } from "../utils/verify-webhook";
import db from "../db.server";

/**
 * Mandatory compliance webhook: delete shop data 48h after uninstall.
 * https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 */
export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const rawBody = await request.text();

  if (!isValidShopifyWebhook(request, rawBody, secret)) {
    console.error("Invalid HMAC for /webhooks/shop/redact");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as { shop_domain?: string };
    const shop = payload.shop_domain;
    if (shop) {
      await db.session.deleteMany({ where: { shop } });
    }
  } catch (error) {
    console.error("shop/redact handler error:", error);
  }

  return new Response("OK", { status: 200 });
}
