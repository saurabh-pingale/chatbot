import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { getShopStatus } from "./get_shop_status";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  let shopStatus = { setup_completed: false };
  try {
    shopStatus = await getShopStatus(shopId);
  } catch (error) {
    console.error("Failed to fetch shop status:", error);
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopStatus
  };
};

export default function App() {
  const { apiKey, shopStatus } = useLoaderData<typeof loader>();
  const isSetupCompleted = shopStatus.setup_completed;

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        {isSetupCompleted && (
          <>
            <Link to="/app/settings">Settings</Link>
            <Link to="/app/training">Training</Link>
            <Link to="/app/analytics">Analytics</Link>
            {/* <Link to="/app/billings">Billing</Link> // TODO: Uncomment when pricing flow is automated completely */}
            <Link to="/app/integrations">Integrations</Link>
          </>
        )}
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
