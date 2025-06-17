import React, { useState, useEffect } from "react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { ActionResponse } from "../common/types/index";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  Banner,
  InlineStack,
  Box,
} from "@shopify/polaris";

interface IntegrationData {
  session: { shop: string };
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ session });
};

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shopId = session.shop;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!shopId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!title || !description) {
    return json({ error: "Title and description are required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.BACKEND_URL}/shop-admin/save-integration?shopId=${shopId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return json({ error: errorData.detail || "Failed to save integration" }, { status: response.status });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error saving integration:", error);
    return json({ error: "Failed to save integration. Please try again." }, { status: 500 });
  }
};

export default function Integrations() {
  const { session } = useLoaderData<IntegrationData>();
  const fetcher = useFetcher<ActionResponse>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const TITLE_LIMIT = 100;
  const DESCRIPTION_LIMIT = 500;

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccessBanner(true);
      setTitle("");
      setDescription("");
      const timer = setTimeout(() => setShowSuccessBanner(false), 2000);
      return () => clearTimeout(timer);
    } else if (fetcher.data?.error) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => setShowErrorBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    if (!title || !description) return;
    fetcher.submit(
      { title, description },
      { method: "post" }
    );
  };

  const isFormValid = title.trim().length > 0 && 
                     description.trim().length > 0 && 
                     title.length <= TITLE_LIMIT && 
                     description.length <= DESCRIPTION_LIMIT;

  return (
    <Page>
      <BlockStack gap="500">
        {showSuccessBanner && (
          <Banner
            title="Integration saved successfully!"
            tone="success"
            onDismiss={() => setShowSuccessBanner(false)}
          />
        )}
        
        {showErrorBanner && (
          <Banner
            title="Error saving integration"
            tone="critical"
            onDismiss={() => setShowErrorBanner(false)}
          >
            <p>{fetcher.data?.error || "An unknown error occurred"}</p>
          </Banner>
        )}
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingLg">
                    Create New Integration
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Fill out the form below to create a new integration. The information will be stored with your shop details.
                  </Text>
                </BlockStack>
                
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="400">
                    <TextField
                      label="Title"
                      value={title}
                      onChange={(value) => setTitle(value)}
                      autoComplete="off"
                      maxLength={TITLE_LIMIT}
                      showCharacterCount
                      requiredIndicator
                    />
                    
                    <TextField
                      label="Description"
                      value={description}
                      onChange={(value) => setDescription(value)}
                      autoComplete="off"
                      multiline={4}
                      maxLength={DESCRIPTION_LIMIT}
                      showCharacterCount
                      requiredIndicator
                    />
                  </BlockStack>
                </Box>
                
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!isFormValid || fetcher.state !== "idle"}
                    loading={fetcher.state !== "idle"}
                  >
                    Save Integration
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About Integrations
                </Text>
                <Text as="p" variant="bodyMd">
                  Integrations allow you to connect this app with other services and tools in your workflow.
                </Text>
                <Text as="p" variant="bodyMd">
                  Each integration you create will be stored with your shop details and can be managed at any time.
                </Text>
                <Text as="p" variant="bodyMd">
                  The title should be a brief name for the integration, while the description should provide more details about its purpose.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}