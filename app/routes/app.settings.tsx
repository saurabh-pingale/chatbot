import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { saveColorPreference } from "./supabaseApi";
import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Button,
  Box,
  Banner,
  Tooltip,
} from "@shopify/polaris";
import { ActionResponse } from "./types";

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5"];

const COLOR_UPDATE_EVENT = "color-preference-updated";

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ session });
};

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const color = formData.get("color") as string;

  if (!session.shop || !color) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await saveColorPreference(session.shop, color);
    return json({ success: true, color });
  } catch (error) {
    console.error("Error in action function:", error); 
    return json({ error: "Failed to save color preference" }, { status: 500 });
  }
};

export default function Settings() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const fetcher = useFetcher<ActionResponse>();
  const { session } = useLoaderData<{ session: { shop: string } }>();

  useEffect(() => {
    if(session?.shop) {
      localStorage.setItem("shopId", session.shop);
    }
  }, [session]);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccessBanner(true);

      const colorUpdateEvent = new CustomEvent(COLOR_UPDATE_EVENT, {
        detail: { color: fetcher.data.color }
      });
      window.dispatchEvent(colorUpdateEvent);

      const timer = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(timer);
    } else if (fetcher.data?.error) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => setShowErrorBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleSave = () => {
    if (selectedColor) {
      fetcher.submit({ color: selectedColor }, { method: "post" });
    }
  };

  const handleCancel = () => {
    setSelectedColor(null);
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page>
      <BlockStack gap="500">
        {showSuccessBanner && (
          <Banner
            title="Settings saved successfully"
            tone="success"
            onDismiss={() => setShowSuccessBanner(false)}
          />
        )}
        
        {showErrorBanner && (
          <Banner
            title="Error saving settings"
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
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingLg">
                      Appearance Settings
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    Customize the appearance of your app by selecting your preferred color theme.
                  </Text>
                </BlockStack>
                
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">
                      Select a color:
                    </Text>
                    <InlineStack gap="300" align="start">
                      {colors.map((color) => (
                        <Tooltip key={color} content={color} preferredPosition="above">
                          <button
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: color,
                              border: selectedColor === color ? "3px solid #000" : "1px solid #DDD",
                              cursor: "pointer",
                              padding: 0,
                              transition: "transform 0.2s ease",
                              transform: selectedColor === color ? "scale(1.1)" : "scale(1)",
                            }}
                            onClick={() => handleColorSelect(color)}
                            aria-label={`Select color ${color}`}
                          />
                        </Tooltip>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </Box>
                
                <InlineStack gap="200">
                  <Button 
                    variant="primary" 
                    onClick={handleSave} 
                    disabled={!selectedColor || isLoading} 
                    loading={isLoading}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    disabled={!selectedColor || isLoading}
                  >
                    Cancel
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About Theme Settings
                </Text>
                <Text as="p" variant="bodyMd">
                  The color you select will be used throughout your app to provide a consistent theme. 
                  Your selection is stored in the database and can be changed at any time.
                </Text>
                <Text as="p" variant="bodyMd">
                  This setting affects:
                </Text>
                <ul style={{ paddingLeft: "20px" }}>
                  <li>App accent colors</li>
                  <li>UI elements</li>
                  <li>Chatbot interface</li>
                </ul>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}