import { createHmac } from "crypto";

export function isValidShopifyWebhook(request: Request, rawBody: string, secret: string) {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-SHA256");
  if (!hmacHeader) return false;

  const generatedHash = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return generatedHash === hmacHeader;
}