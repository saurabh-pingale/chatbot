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
} from "@shopify/polaris";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";

interface LoaderData {
  shop: string;
}

const features = [
  "Add and manage your own FAQs and reduce customer support workload",
  "Bulk upload up to 50 FAQs at once using a CSV template",
  "Smart search matches customer queries to your FAQs",
];

const exampleQuestions = [
  "How do I track my order?",
  "What's your return policy?",
  "How can I contact customer support?",
  "What are your business hours?",
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
  const navigate = useNavigate();

  const themeEditorDeepLink = shop
    ? `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${encodeURIComponent("reezo-ai-1/chatbot-extension")}`
    : null;

  return (
    <Page>
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">
              Welcome to the Faq Chatbot App!
            </Text>
            <Text variant="bodyMd" as="p">
              Your store's faq assistant, powered by advance searching
              capabilities to provide accurate, helpful answers to your
              customers.
            </Text>
            <InlineStack gap="300">
              <Button variant="primary" onClick={() => navigate("/app/faqs")}>
                Manage FAQs
              </Button>
              {themeEditorDeepLink && (
                <Button
                  onClick={() => window.open(themeEditorDeepLink, "_blank")}
                >
                  Open Theme Editor
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Banner title="Get started with your FAQs" tone="info">
                  Add questions and answers that your customers ask most often.
                  The chatbot will use smart search to match customer queries
                  and return the best answer.
                </Banner>

                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    How it works
                  </Text>
                  <InlineStack wrap={false} gap="500" align="start">
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      minWidth="40px"
                    >
                      <Text as="p" variant="headingMd" alignment="center">
                        1
                      </Text>
                    </Box>
                    <Text as="p">
                      Add FAQs one at a time or bulk upload up to 50 using the
                      CSV template in the FAQ manager
                    </Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500" align="start">
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      minWidth="40px"
                    >
                      <Text as="p" variant="headingMd" alignment="center">
                        2
                      </Text>
                    </Box>
                    <Text as="p">
                      A customer asks a question through the chat interface on
                      your store
                    </Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500" align="start">
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      minWidth="40px"
                    >
                      <Text as="p" variant="headingMd" alignment="center">
                        3
                      </Text>
                    </Box>
                    <Text as="p">
                      The chatbot searches your FAQs to find the closest
                      matching question
                    </Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500" align="start">
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      minWidth="40px"
                    >
                      <Text as="p" variant="headingMd" alignment="center">
                        4
                      </Text>
                    </Box>
                    <Text as="p">
                      The customer receives the matching answer instantly
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Key Features
                  </Text>
                  <List type="bullet">
                    {features.map((feature, index) => (
                      <List.Item key={index}>{feature}</List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Example Questions
                  </Text>
                  <Text as="p" variant="bodyMd">
                    You can add FAQs like these for your customers:
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
