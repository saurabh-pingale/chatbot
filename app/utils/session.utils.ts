import { getShopStatus } from "../routes/get_shop_status";

export const getShopId = (session: any): string | null => {
  if (session && typeof session === "object" && typeof session.shop === "string") {
    return session.shop;
  } else {
    console.warn("Invalid session or session.shop", session);
    return null;
  }
};

export const getAccessToken = (session: any): string | null => {
  if (session && typeof session === "object" && typeof session.accessToken === "string") {
    return session.accessToken;
  } else {
    return null;
  }
};

export const getShopStatusSafe = async (
  shopId: string | null
): Promise<{
  setup_completed: boolean;
  plan?: string | null;
  subscription_status?: string | null;
  end_date?: string | null;
}> => {
  if (!shopId) {
    return { setup_completed: false };
  }

  try {
    const result = await getShopStatus(shopId);

    if (result && typeof result === "object") {
      const setup_completed =
        "setup_completed" in result &&
        typeof result.setup_completed === "boolean"
          ? result.setup_completed
          : false;

      return {
        setup_completed,
        plan: typeof result.plan === "string" ? result.plan : null,
        subscription_status:
          typeof result.subscription_status === "string"
            ? result.subscription_status
            : null,
        end_date: typeof result.end_date === "string" ? result.end_date : null,
      };
    } else {
      console.warn("Invalid shop status structure:", result);
      return { setup_completed: false };
    }
  } catch (error) {
    console.error("Failed to fetch shop status:", error);
    return { setup_completed: false };
  }
};