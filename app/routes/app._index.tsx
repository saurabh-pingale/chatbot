import React, { useState } from "react";
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
  Collapsible,
} from "@shopify/polaris";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getShopId } from "../utils/session.utils";

interface LoaderData {
  shop: string;
}

const features = [
  "Sync your Shopify products to Supabase organized by category",
  "Browse the catalog through guided auto-suggestions in the admin panel",
  "View every product in a category with rich product cards",
];

const exampleQuestions = [
  "Show me matching products for a red dress",
  "What sneakers are available in size 10?",
  "Find beach accessories with fast shipping",
  "Search for gifts under $50",
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

export function getThemeEditorDeepLink(
  shop: string,
  template: string = "index",
): string {
  const APP_EMBED_BLOCK_HANDLE = "chatbot";
  const SHOPIFY_API_KEY = "87d90090dd00b1d5fe09301727899bb9";
  const activateAppId = `${SHOPIFY_API_KEY}/${APP_EMBED_BLOCK_HANDLE}`;
  return `https://${shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${activateAppId}`;
}

export default function Index() {
  const { shop } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [setupOpen, setSetupOpen] = useState(false);
  const APP_BRAND_NAME = "Cognito Assistant";
  const themeEditorDeepLink = shop ? getThemeEditorDeepLink(shop) : null;

  return (
    <Page>
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">
              Welcome to {APP_BRAND_NAME}!
            </Text>
            <Text variant="bodyMd" as="p">
              Your store&apos;s FAQ assistant, powered by smart search to give
              customers accurate, helpful answers.
            </Text>
            <InlineStack gap="300">
              <Button variant="primary" onClick={() => navigate("/app/product-sync")}>
                Product sync
              </Button>
              {themeEditorDeepLink && (
                <Button
                  onClick={() => window.open(themeEditorDeepLink, "_blank")}
                >
                  Enable chatbot in theme
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
                  {APP_BRAND_NAME} uses smart search to match customer queries
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
                      The {APP_BRAND_NAME} widget searches your FAQs to find the
                      closest matching question
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

        <Card>
          <BlockStack gap="200">
            <Button
              variant="monochromePlain"
              disclosure={setupOpen ? "up" : "down"}
              onClick={() => setSetupOpen((open) => !open)}
              textAlign="left"
            >
              Set up the storefront chatbot (app embed)
            </Button>
            <Collapsible
              open={setupOpen}
              id="app-embed-setup"
              transition={{ duration: "150ms", timingFunction: "ease" }}
            >
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  The chatbot is an app embed. It stays off until you enable it
                  in the theme editor and save.
                </Text>
                <List type="number">
                  <List.Item>
                    Click{" "}
                    <Text as="span" fontWeight="semibold">
                      Enable chatbot in theme
                    </Text>{" "}
                    (opens the theme editor App embeds panel for Cognito Assistant).
                  </List.Item>
                  <List.Item>
                    Turn on the{" "}
                    <Text as="span" fontWeight="semibold">
                      Cognito Assistant
                    </Text>{" "}
                    toggle.
                  </List.Item>
                  <List.Item>
                    Click{" "}
                    <Text as="span" fontWeight="semibold">
                      Save
                    </Text>{" "}
                    in the theme editor.
                  </List.Item>
                  <List.Item>
                    Preview your storefront — the chat widget should appear. Add
                    FAQs under{" "}
                    <Text as="span" fontWeight="semibold">
                      Manage FAQs
                    </Text>{" "}
                    so the bot can answer customers.
                  </List.Item>
                </List>
                <Text as="p" variant="bodySm" tone="subdued">
                  Manual path: Online Store → Themes → Customize → App embeds →
                  enable Cognito Assistant → Save.
                </Text>
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
