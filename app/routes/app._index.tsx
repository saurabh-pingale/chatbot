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
  "Sync your Shopify products into our product discovery system",
  "Browse the products through guided auto-suggestions in the admin panel",
  "View every product in a category with rich product cards",
];

const exampleBrowsing = [
  "Browse products by category",
  "View product details with pricing and availability",
  "Discover items through guided suggestions",
  "Explore your entire catalog easily",
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
  const SHOPIFY_API_KEY = "f295d1e7944ddacc405d0630c25839f1";
  const activateAppId = `${SHOPIFY_API_KEY}/${APP_EMBED_BLOCK_HANDLE}`;
  return `https://${shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${activateAppId}`;
}

export default function Index() {
  const { shop } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [setupOpen, setSetupOpen] = useState(false);
  const APP_BRAND_NAME = "ReezoAI Assist";
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
              Your store&apos;s smart product discovery assistant, helping customers browse and discover products through guided category suggestions. Designed with built-in security and privacy protections for a trusted shopping experience.
            </Text>
            <InlineStack gap="300">
              <Button variant="primary" onClick={() => navigate("/app/product-sync")}>
                Sync Products
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
              <BlockStack gap="800">
                <Banner title="Get started with Sync Products" tone="info">
                  Sync your Shopify products to enable smart product discovery.
                  {APP_BRAND_NAME} organizes your catalog by category to help customers browse and find products easily.
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
                      Sync your products from Shopify to organize them by category into our product discovery system.
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
                      Customers visit your store and interact with the ReezoAI Assist widget to discover products through an intuitive browsing experience
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
                      The {APP_BRAND_NAME} widget guides customers through categories with smart suggestions
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
                      Customers discover and view products with detailed cards showing pricing and availability
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
                    Product Discovery
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Customers can:
                  </Text>
                  <List type="bullet">
                    {exampleBrowsing.map((example, index) => (
                      <List.Item key={index}>{example}</List.Item>
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
                    (opens the theme editor App embeds panel for ReezoAI Assist).
                  </List.Item>
                  <List.Item>
                    Turn on the{" "}
                    <Text as="span" fontWeight="semibold">
                      ReezoAI Assist
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
                    Preview your storefront — the product discovery widget should appear. Sync products from the{" "}
                    <Text as="span" fontWeight="semibold">
                      Sync Products
                    </Text>{" "}
                    page so customers can browse your catalog.
                  </List.Item>
                </List>
                <Text as="p" variant="bodySm" tone="subdued">
                  Manual path: Online Store → Themes → Customize → App embeds →
                  enable ReezoAI Assist → Save.
                </Text>
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
