import React from "react";
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
import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getShopStatus } from "./get_shop_status";

interface LoaderData {
  shop: string;
  plan: string | null;
  setupCompleted: boolean;
  subscriptionStatus: string | null;
  endDate: string | null;
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
  const shopId = session.shop;

  try {
    const { plan, setup_completed, subscription_status, end_date } = await getShopStatus(shopId);
    return json({ 
      shop: shopId, 
      plan, 
      setupCompleted: setup_completed,
      subscriptionStatus: subscription_status,
      endDate: end_date 
    });
  } catch (error) {
    console.error("Failed to fetch shop status:", error);
    return json({ shop: shopId, plan: null, setupCompleted: false, subscriptionStatus: null, endDate: null });
  }
};

export default function Index() {
  const { plan, setupCompleted, subscriptionStatus, endDate } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const navigation = useNavigation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isLoading = navigation.state !== "idle";

  const showSubscriptionWarning = () => {
    if (!endDate || (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing')) {
      return false;
    }
    const now = new Date();
    const expiry = new Date(endDate);
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return daysUntilExpiry <= 7;
  }

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
        {showSubscriptionWarning() && (
            <Banner
                title="Your subscription is ending soon!"
                tone="warning"
                // TODO: Uncomment when pricing flow is automated completely
                // action={{
                //     content: "Renew Now",
                //     onAction: () => handleNavigation("/app/billings"),
                // }}
            >
                <p>
                    Your <strong>{plan}</strong> plan will expire on {new Date(endDate!).toLocaleDateString()}. 
                    {/*// TODO: Uncomment when pricing flow is automated completely
                      Please renew to avoid service interruption. */}
                </p>
            </Banner>
        )}
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Welcome to the Smart Chatbot App!
            </Text>
            <Text as="p" variant="bodyMd">
              Your current plan is: <strong>{plan || "Not selected"}</strong>
            </Text>
            {!setupCompleted && (
              <Banner
                title="Setup required"
                tone="warning"
                action={{
                  content: "Complete Setup",
                  onAction: () => handleNavigation("/app/settings"),
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

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Quick Actions
            </Text>
            <InlineStack gap="400" align="center">
              <Button onClick={() => handleNavigation("/app/settings")}>
                Go to Settings
              </Button>
              <Button onClick={() => handleNavigation("/app/training")}>
                Train Chatbot
              </Button>
              <Button onClick={() => handleNavigation("/app/analytics")}>
                View Analytics
              </Button>
              // TODO: Uncomment when pricing flow is automated completely
              {/* TODO: Uncomment when pricing flow is automated completely
                <Button onClick={() => handleNavigation("/app/billings")}>
                View Billing
              </Button> */}
              <Button onClick={() => handleNavigation("/app/integrations")}>
                Go to Integrations
              </Button>
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