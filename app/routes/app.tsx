import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

async function pingWithSessionToken() {
  const shopifyGlobal = window.shopify;
  if (!shopifyGlobal?.idToken) return;

  await shopifyGlobal.ready;
  const token = await shopifyGlobal.idToken();
  await fetch("/app/ping", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  useEffect(() => {
    void pingWithSessionToken().catch(() => {
      // Best-effort telemetry for Partner Dashboard session-token checks.
    });
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/product-sync">Sync Products</Link>
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
