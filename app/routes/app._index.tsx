import React, { useEffect, useRef, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Box,
  BlockStack,
  List,
  Text,
  InlineStack,
  Button,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigation, useNavigate, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";
import { useRootData } from "../hooks/useRootData";
import { StatusPopup } from "../components/StatusPopup";

interface LoaderData {
  shop: string;
}

const features = [
    "Trained with specialized vectors for accurate responses",
    "Answers product-specific questions instantly",
    "Reduces customer support workload",
    "Improves customer satisfaction with 24/7 availability",
    "Customizable to match your brand voice"
];

const exampleQuestions = [
    "How do I track my order?",
    "What's your return policy?",
    "Are there any active promotions?",
    "Do you ship internationally?",
    "How can I contact customer support?"
];

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopId = getShopId(session);

  if (!shopId) {
    return json({ shop: null });
  }

  return json({ shop: shopId });
};

export const shouldRevalidate = () => false;

export default function Index() {
  const { shop } = useLoaderData<LoaderData>();
  const { setupCompleted, shopStatus } = useRootData();
  const { plan, subscription_status: subscriptionStatus, end_date: endDate } = shopStatus || {};
  const navigation = useNavigation();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ status: string; data: any }>();
  const fetcherRef = useRef(fetcher);

  const [isBackendReady, setIsBackendReady] = useState<boolean>(setupCompleted);

  const isLoading = navigation.state !== "idle";

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (isBackendReady) return;

    const pollStatus = () => {
      if (fetcherRef.current.state === "idle") {
        fetcherRef.current.load("/api/status");
      }
    };

    pollStatus();

    const intervalId = setInterval(pollStatus, 1000);

    return () => clearInterval(intervalId);
  }, [isBackendReady]);

  useEffect(() => {
    if (fetcher.data?.status === "ok") {
      setIsBackendReady(true);
    }
  }, [fetcher.data]);

  if (!isBackendReady) {
    return <StatusPopup />;
  }

  const themeEditorDeepLink = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${encodeURIComponent('reezo-ai-1/chatbot-extension')}`;

  return (
    <Page>
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <Spinner accessibilityLabel="Loading..." />
        </div>
      )}
      <BlockStack gap="500">
        {/* TODO: Uncomment when pricing flow is automated completely */}
        {/* {showSubscriptionWarning() && (
            <Banner
                title="Your subscription is ending soon!"
                tone="warning"
                action={{
                    content: "Renew Now",
                    onAction: () => navigate("/app/billings"),
                }}
            >
                <p>
                    Your <strong>{plan}</strong> plan will expire on {new Date(endDate!).toLocaleDateString()}.
                      Please renew to avoid service interruption.
                </p>
            </Banner>
        )} */}
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Welcome to the Smart Chatbot App!
            </Text>
            {/* TODO: Uncomment when pricing flow is introduced
             <Text as="p" variant="bodyMd">
              Your current plan is: <strong>{plan || "Not selected"}</strong>
            </Text> */}
            {!setupCompleted && (
              <Banner
                title="Setup required"
                tone="warning"
                action={{
                  content: "Complete Setup",
                  onAction: () => navigate("/app/settings"),
                }}
              >
                <p>
                  Please complete the setup process to activate the chatbot for
                  your store.
                </p>
              </Banner>
            )}
          </BlockStack>
        </Card>

        {!setupCompleted && (
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Install Chatbot on Your Store
            </Text>
            <Text as="p" variant="bodyMd">
              Follow these steps to add the chatbot to your storefront:
            </Text>
            
            <BlockStack gap="300">
              <InlineStack wrap={false} gap="500" align="start">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="40px">
                  <Text as="p" variant="headingMd" alignment="center" fontWeight="bold">1</Text>
                </Box>
                <Box minWidth="0" width="100%">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Add via Theme Editor
                  </Text>
                  <Text as="p" variant="bodyMd">
                    The easiest way to add the chatbot to your store is through the theme editor.
                  </Text>
                  <Box paddingBlockStart="300">
                    <Button 
                      variant="primary" 
                      onClick={() => window.open(themeEditorDeepLink, '_blank')}
                    >
                      Open Theme Editor
                    </Button>
                  </Box>
                </Box>
              </InlineStack>

              <InlineStack wrap={false} gap="500" align="start">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="40px">
                  <Text as="p" variant="headingMd" alignment="center" fontWeight="bold">2</Text>
                </Box>
                <Box minWidth="0" width="100%">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Locate App Embed section
                  </Text>
                  <Text as="p" variant="bodyMd">
                    In the theme editor, look for the "App embeds" section (usually in theme settings or footer).
                  </Text>
                </Box>
              </InlineStack>

              <InlineStack wrap={false} gap="500" align="start">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="40px">
                  <Text as="p" variant="headingMd" alignment="center" fontWeight="bold">3</Text>
                </Box>
                <Box minWidth="0" width="100%">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Enable Chatbot App Embed
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Toggle on the "Smart Chatbot" option to enable the chatbot on your storefront.
                  </Text>
                </Box>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Quick Actions
            </Text>
            <InlineStack gap="400" align="center">
              <Button onClick={() => navigate("/app/settings")}>Go to Settings</Button>
              <Button onClick={() => navigate("/app/training")}>Train Chatbot</Button>
              <Button onClick={() => navigate("/app/analytics")}>View Analytics</Button>
              <Button onClick={() => navigate("/app/integrations")}>Go to Integrations</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingLg">
                      AI-Powered Chatbot
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    Your store's intelligent assistant, powered by AI and trained with specialized vectors to provide accurate, helpful responses to your customers.
                  </Text>
                </BlockStack>

                <Banner title="Ready to assist your customers" tone="success">
                  Your chatbot is active and ready to help your customers with their questions.
                </Banner>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    How it works
                  </Text>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">1</Text>
                    </Box>
                    <Text as="p">Customer asks a question through the chat interface</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">2</Text>
                    </Box>
                    <Text as="p">Chatbot using Advanced Artifical Intelligence</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">3</Text>
                    </Box>
                    <Text as="p">ChatBot processes the question using trained data</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">4</Text>
                    </Box>
                    <Text as="p">ChatBot helps in get latest products</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">5</Text>
                    </Box>
                    <Text as="p">ChatBot helps in get latest orders requests</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">6</Text>
                    </Box>
                    <Text as="p">ChatBot helps in boost sales</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingMd">
                      Key Features
                    </Text>
                  </InlineStack>
                  <List type="bullet">
                    {features.map((feature, index) => (
                      <List.Item key={index}>{feature}</List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingMd">
                      Example Questions
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    Your chatbot can handle questions like:
                  </Text>
                  <List type="bullet">
                    {exampleQuestions.map((question, index) => (
                      <List.Item key={index}>{question}</List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}