import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug;
  const prefix = params.proxyPrefix;

  if (prefix !== "chatbot-api-1") {
    return new Response("Invalid proxy path", { status: 404 });
  }

  const routeMap: Record<string, () => Promise<any>> = {
    "agent_conversation": () => import("./agent_conversation"),
    "store_checkout_product": () => import("./store_checkout_product"),
    "remove_checkout_product": () => import("./remove_checkout_product"),
    "initiate_session": () => import("./initiate_session"),
    "send-otp": () => import("./send-otp"),
    "verify-otp": () => import("./verify-otp"),
    "track_opened_chatbot": () => import("./track_opened_chatbot"),
    "track_added_to_cart": () => import("./track_added_to_cart"),
    "shop-config": () => import("./shop-config"),
    "latest-inventory": () => import("./latest-inventory"),
    "get_cart": () => import("./get_cart"),
    "add_to_cart": () => import("./add_to_cart"),
    "remove_from_cart": () => import("./remove_from_cart"),
    "clear_cart": () => import("./clear_cart"),
  };

  const moduleLoader = routeMap[slug || ""];

  if (!moduleLoader) {
    return new Response("Route not found", { status: 404 });
  }

  const mod = await moduleLoader();

  if (typeof mod.loader !== "function") {
    return new Response("Invalid route module", { status: 500 });
  }

  return mod.loader({ request, params });
}