import React from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  InlineStack,
  Banner,
  Box,
  Divider,
  EmptyState,
  List,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";
import { MAX_BULK_FAQS } from "../utils/faq.utils";
import { getSupabaseConfig } from "../utils/supabase.config";
import { useFaqManager } from "../hooks/useFaqManager";
import emptyStateImage from "../images/emptystate-files.avif";

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

export default function FaqsPage() {
  const { shop, supabaseUrl, supabaseKey } = useLoaderData<LoaderData>();

  const {
    fileInputRef,
    configMissing,
    faqs,
    isLoading,
    isSaving,
    loadError,
    question,
    answer,
    editingId,
    showSuccess,
    successMessage,
    formError,
    bulkError,
    bulkPreview,
    selectedFileName,
    templateDownloaded,
    setShowSuccess,
    setLoadError,
    setBulkError,
    setQuestion,
    setAnswer,
    resetForm,
    resetBulkUpload,
    handleSave,
    handleEdit,
    handleDelete,
    handleDownloadTemplate,
    handleFileSelect,
    handleBulkImport,
    fallbackMessage,
    settingsError,
    setFallbackMessage,
    setSettingsError,
    handleSaveFallback,
  } = useFaqManager({ shop, supabaseUrl, supabaseKey });

  if (configMissing) {
    console.log("Configuration is missing");
  }

  return (
    <Page
      title="FAQ Management"
      subtitle={`Add questions and answers to a chatbot will use to help customers`}
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="500">

        {loadError && (
          <Banner
            title="Error loading FAQs"
            tone="critical"
            onDismiss={() => setLoadError("")}
          >
            <p>{loadError}</p>
          </Banner>
        )}

        {showSuccess && (
          <Banner
            title={successMessage}
            tone="success"
            onDismiss={() => setShowSuccess(false)}
          >
            <p>Your changes have been saved.</p>
          </Banner>
        )}

        {bulkError && (
          <Banner
            title="Bulk upload error"
            tone="critical"
            onDismiss={() => setBulkError("")}
          >
            <p>{bulkError}</p>
          </Banner>
        )}

        {settingsError && (
          <Banner
            title="Settings error"
            tone="critical"
            onDismiss={() => setSettingsError("")}
          >
            <p>{settingsError}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Default fallback message
            </Text>
            <Text as="p" variant="bodyMd">
              Shown in the chatbot when a customer question does not match any
              FAQ. Top FAQ suggestions are also displayed below this message.
            </Text>
            <TextField
              label="Fallback message"
              value={fallbackMessage}
              onChange={setFallbackMessage}
              multiline={3}
              autoComplete="off"
              disabled={isSaving || configMissing}
            />
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSaveFallback}
                loading={isSaving}
                disabled={configMissing}
              >
                Save fallback message
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              {`Your FAQs (${faqs.length})`}
            </Text>


          {(isLoading || isSaving) && (
            <InlineStack align="center" gap="200">
              <Spinner accessibilityLabel="Loading" size="small" />
              <Text as="span" variant="bodySm" tone="subdued">
                {isLoading ? "Loading FAQs..." : "Saving..."}
              </Text>
            </InlineStack>
          )}

            {!isLoading && faqs.length === 0 ? (
              <EmptyState
                heading="No FAQs yet"
                image={emptyStateImage}
              >
                <p>
                  Add your first question and answer below, or use bulk upload
                  to import multiple FAQs at once.
                </p>
              </EmptyState>
            ) : (
              <BlockStack gap="400">
                {faqs.map((faq, index) => (
                  <Box key={faq.id}>
                    {index > 0 && (
                      <Box paddingBlockEnd="400">
                        <Divider />
                      </Box>
                    )}
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        {faq.question}
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {faq.answer}
                      </Text>
                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          onClick={() => handleEdit(faq)}
                          disabled={isSaving}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() => handleDelete(faq.id)}
                          disabled={isSaving}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {editingId ? "Edit FAQ" : "Add New FAQ"}
                </Text>
                <TextField
                  label="Question"
                  value={question}
                  onChange={setQuestion}
                  autoComplete="off"
                  placeholder="e.g. How do I track my order?"
                  disabled={isSaving || configMissing}
                />
                <TextField
                  label="Answer"
                  value={answer}
                  onChange={setAnswer}
                  multiline={4}
                  autoComplete="off"
                  placeholder="Provide a clear, helpful answer for your customers"
                  disabled={isSaving || configMissing}
                />
                {formError && (
                  <Text as="p" tone="critical">
                    {formError}
                  </Text>
                )}
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={configMissing}
                  >
                    {editingId ? "Update FAQ" : "Add FAQ"}
                  </Button>
                  {editingId && (
                    <Button onClick={resetForm} disabled={isSaving}>
                      Cancel
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Tips
                </Text>
                <Text as="p" variant="bodyMd">
                  Write questions the way your customers naturally ask them.
                  Keep answers concise and direct.
                </Text>
                <Text as="p" variant="bodyMd">
                  The chatbot uses smart search to match customer queries with
                  your FAQ questions and returns the best matching answer.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Bulk Upload FAQs
              </Text>
              <Text as="p" variant="bodyMd">
                Import up to {MAX_BULK_FAQS} FAQs at once using a CSV file.
                Download the template first, replace the example rows with your
                own content, then upload the file.
              </Text>
            </BlockStack>

            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Step 1 — Download CSV template
                </Text>
                <List type="number">
                  <List.Item>
                    Click below to download the template with{" "}
                    <Text as="span" fontWeight="semibold">
                      Question
                    </Text>{" "}
                    and{" "}
                    <Text as="span" fontWeight="semibold">
                      Answer
                    </Text>{" "}
                    column headers
                  </List.Item>
                  <List.Item>
                    The template includes 2 example FAQs — replace them with
                    your own questions and answers
                  </List.Item>
                  <List.Item>
                    Keep the header row unchanged and save the file as{" "}
                    <Text as="span" fontWeight="semibold">
                      .csv
                    </Text>
                  </List.Item>
                  <List.Item>
                    Maximum {MAX_BULK_FAQS} FAQs per upload; both columns are
                    required for each row
                  </List.Item>
                </List>
                <InlineStack gap="200" blockAlign="center">
                  <Button onClick={handleDownloadTemplate}>
                    Download CSV Template
                  </Button>
                  {templateDownloaded && (
                    <Text as="span" tone="success" variant="bodySm">
                      Template downloaded
                    </Text>
                  )}
                </InlineStack>
              </BlockStack>
            </Box>

            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Step 2 — Upload your CSV file
                </Text>
                <Text as="p" variant="bodyMd">
                  Only CSV files are accepted. Imported FAQs are added to your
                  existing list and saved immediately.
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  disabled={configMissing || isSaving}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#f6f6f7",
                    borderRadius: "8px",
                    border: "1px solid #dcdcdc",
                    cursor: configMissing || isSaving ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                />
                {selectedFileName && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Selected file: {selectedFileName}
                  </Text>
                )}
              </BlockStack>
            </Box>

            {bulkPreview && bulkPreview.length > 0 && (
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    {`Preview — ${bulkPreview.length} FAQ${bulkPreview.length === 1 ? "" : "s"} ready to import`}
                  </Text>
                  <BlockStack gap="300">
                    {bulkPreview.slice(0, 3).map((row, index) => (
                      <BlockStack key={index} gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {row.question}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {row.answer}
                        </Text>
                      </BlockStack>
                    ))}
                    {bulkPreview.length > 3 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {`…and ${bulkPreview.length - 3} more`}
                      </Text>
                    )}
                  </BlockStack>
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={handleBulkImport}
                      loading={isSaving}
                    >
                      {`Import ${bulkPreview.length} FAQ${bulkPreview.length === 1 ? "" : "s"}`}
                    </Button>
                    <Button onClick={resetBulkUpload} disabled={isSaving}>
                      Cancel
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
