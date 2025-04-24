import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { saveColorPreference } from "./save_color_preference";
import { saveSupportInfo } from "./save_support_info";
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
  TextField,
} from "@shopify/polaris";
import { ActionResponse } from "app/common/types";
import { uploadToCloudinary } from "./cloudinary.api";
import { saveImageURLs } from "./save_image_urls";

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5"];

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ session });
};

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const color = formData.get("color") as string | null;
  const supportEmail = formData.get("supportEmail") as string | null;
  const supportPhone = formData.get("supportPhone") as string | null;

  if (!session.shop || (!color && !supportEmail && !supportPhone)) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    if(color) {
      await saveColorPreference(session.shop, color);
    }
    
    if (supportEmail || supportPhone) {
      await saveSupportInfo(session.shop, supportEmail || "", supportPhone || "");
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error in action function:", error); 
    return json({ error: "Failed to save save settings" }, { status: 500 });
  }
};

export default function Settings() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSubmitSupportDetails = () => {
    fetcher.submit(
      { supportEmail, supportPhone },
      { method: "post" }
    );
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setUploading(true);
  
    const imageUrl = await uploadToCloudinary(file);
  
    if (imageUrl) {
      setUploadedImage(imageUrl);
    }
  
    setUploading(false);
  };
  
const handleSubmitImages = async () => {
  const shopId = session?.shop;
  if (!shopId || !uploadedImage) return;

  try {
    setSaving(true);
    await saveImageURLs(shopId, uploadedImage);
    setShowSuccessBanner(true);
  } catch (error) {
    setShowErrorBanner(true);
  } finally {
    setSaving(false);
  }
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

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingLg">
                      Support Contact Info
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    Provide your support email and phone number so your customers can contact you if needed.
                  </Text>
                </BlockStack>

                <BlockStack gap="300">
                  <TextField
                    label="Support Email"
                    type="email"
                    value={supportEmail}
                    onChange={(value) => setSupportEmail(value)}
                    autoComplete="email"
                  />
                  <TextField
                    label="Support Phone Number"
                    type="tel"
                    value={supportPhone}
                    onChange={(value) => setSupportPhone(value)}
                    autoComplete="tel"
                  />
                </BlockStack>

                <InlineStack gap="200">
                  <Button 
                    variant="primary" 
                    onClick={handleSubmitSupportDetails} 
                    loading={isLoading}
                  >
                    Save Support Info
                  </Button>
                  <Button 
                    onClick={() => {
                      setSupportEmail("");
                      setSupportPhone("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingLg">
                      Chatbot Appearance Images
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    Upload custom image to personalize your chatbot's toggle button and header appearance.
                  </Text>
                </BlockStack>

                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h3">
                      Upload Chatbot Image
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Supported formats: JPG, PNG. Recommended size: 100x100 pixels.
                    </Text>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#f6f6f7",
                        borderRadius: "8px",
                        border: "1px solid #dcdcdc",
                        cursor: "pointer"
                      }}
                    />
                    {uploadedImage && (
                      <Box paddingBlockStart="300">
                        <img
                          src={uploadedImage}
                          alt="Uploaded preview"
                          style={{
                            maxWidth: "150px",
                            maxHeight: "150px",
                            objectFit: "contain",
                            borderRadius: "12px",
                            boxShadow: "0 0 0 1px #ccc"
                          }}
                        />
                      </Box>
                    )}
                  </BlockStack>
                </Box>
                  
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={uploadedImage ? handleSubmitImages : undefined}
                    disabled={!uploadedImage || uploading || saving}
                    loading={uploading || saving}
                  >
                    {uploading
                      ? "Uploading..."
                      : saving
                      ? "Saving..."
                      : uploadedImage
                      ? "Save Image"
                      : "Upload Image First"}
                  </Button>
                  <Button
                    onClick={() => setUploadedImage(null)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}