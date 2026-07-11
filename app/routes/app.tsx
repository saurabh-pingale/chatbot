import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { getShopId, getShopStatusSafe } from "../utils/session.utils";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopId = getShopId(session);
  const shopStatus = await getShopStatusSafe(shopId);

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
        <Link to="/app/faqs">FAQs</Link>
        {isSetupCompleted && (
          <>
            <Link to="/app/settings">Settings</Link>
            <Link to="/app/training">Training</Link>
            <Link to="/app/analytics">Analytics</Link>
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
