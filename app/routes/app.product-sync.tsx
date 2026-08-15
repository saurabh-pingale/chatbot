import React from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";
import { getSupabaseConfig } from "../utils/supabase.config";
import { useProductSyncManager } from "../hooks/useProductSyncManager";
import ProductSyncSection from "../components/ProductSyncSection";
import ChatSearchSection from "../components/ChatSearchSection";

interface LoaderData {
  shop: string | null;
  supabaseUrl: string;
  supabaseKey: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopId = getShopId(session);
  const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabaseConfig();

  return json({
    shop: shopId ?? null,
    supabaseUrl,
    supabaseKey,
  });
};

export default function ProductSyncPage() {
  const { shop, supabaseUrl, supabaseKey } = useLoaderData<LoaderData>();

  const {
    products,
    categories,
    chatMessages,
    chatStep,
    suggestions,
    isLoading,
    isSyncing,
    isFetchingCategory,
    syncTotal,
    syncedCount,
    syncProgress,
    syncMessage,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    configMissing,
    handleSync,
    handleSuggestion,
  } = useProductSyncManager({ shop, supabaseUrl, supabaseKey });

  return (
    <Page
      title="Product sync"
      subtitle="Sync your Shopify catalog and explore products through guided category suggestions"
      backAction={{ content: "Home", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <ProductSyncSection
            productsCount={products.length}
            categoriesCount={categories.length}
            isSyncing={isSyncing}
            syncTotal={syncTotal}
            syncedCount={syncedCount}
            syncProgress={syncProgress}
            syncMessage={syncMessage}
            error={error}
            successMessage={successMessage}
            configMissing={configMissing}
            onSync={handleSync}
            onDismissError={() => setError("")}
            onDismissSuccess={() => setSuccessMessage("")}
          />
        </Layout.Section>

        <Layout.Section>
          <ChatSearchSection
            messages={chatMessages}
            suggestions={suggestions}
            chatStep={chatStep}
            isLoading={isLoading}
            isSyncing={isSyncing}
            isFetchingCategory={isFetchingCategory}
            configMissing={configMissing}
            categoriesCount={categories.length}
            onSuggestion={handleSuggestion}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
