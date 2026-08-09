import React from "react";
import { Banner, BlockStack, Button, Card, InlineStack, ProgressBar, Text } from "@shopify/polaris";

interface ProductSyncSectionProps {
  productsCount: number;
  categoriesCount: number;
  isSyncing: boolean;
  syncTotal: number | null;
  syncedCount: number;
  syncProgress: number;
  syncMessage: string;
  error: string;
  successMessage: string;
  configMissing: boolean;
  onSync: () => Promise<void> | void;
  onDismissError: () => void;
  onDismissSuccess: () => void;
}

export default function ProductSyncSection({
  productsCount,
  categoriesCount,
  isSyncing,
  syncTotal,
  syncedCount,
  syncProgress,
  syncMessage,
  error,
  successMessage,
  configMissing,
  onSync,
  onDismissError,
  onDismissSuccess,
}: ProductSyncSectionProps) {
  const isProgressVisible = isSyncing && syncTotal !== null;

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Sync Shopify products
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Pull products from your connected Shopify store and organize them by category in Supabase for guided catalog browsing.
        </Text>

        {error ? (
          <Banner title="Error" tone="critical" onDismiss={onDismissError}>
            <p>{error}</p>
          </Banner>
        ) : null}

        {successMessage ? (
          <Banner tone="success" onDismiss={onDismissSuccess}>
            <p>{successMessage}</p>
          </Banner>
        ) : null}

        <InlineStack gap="200" blockAlign="center">
          <Button
            variant="primary"
            onClick={onSync}
            loading={isSyncing}
            disabled={configMissing}
          >
            {isSyncing ? "Syncing products..." : "Sync products"}
          </Button>
          <Text as="p" variant="bodyMd" tone="subdued">
            {productsCount} products · {categoriesCount} categories saved
          </Text>
        </InlineStack>

        {isProgressVisible ? (
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Sync progress — {syncedCount} / {syncTotal} products
              </Text>
              <ProgressBar progress={syncProgress} />
              <Text as="p" variant="bodySm" tone="subdued">
                {syncMessage}
              </Text>
            </BlockStack>
          </Card>
        ) : null}
      </BlockStack>
    </Card>
  );
}
