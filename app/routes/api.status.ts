import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";
import { getShopStatus } from "./get_shop_status";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = getShopId(session);

  if (!shopId) {
    return json({ status: "error", message: "No shop ID found" }, { status: 400 });
  }

  try {
    const shopStatus = await getShopStatus(shopId);
    
    return json({ 
      status: "ok", 
      data: shopStatus 
    }, { status: 200 });

  } catch (error) {
    return json({ 
      status: "error", 
      message: "Backend unavailable" 
    }, { status: 503 });
  }
};