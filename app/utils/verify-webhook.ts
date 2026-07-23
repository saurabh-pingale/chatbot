import { createHmac, timingSafeEqual } from "crypto";

export function isValidShopifyWebhook(
  request: Request,
  rawBody: string,
  secret: string,
) {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
  if (!hmacHeader || !secret) return false;

  const generatedHash = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    const a = Buffer.from(generatedHash);
    const b = Buffer.from(hmacHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
