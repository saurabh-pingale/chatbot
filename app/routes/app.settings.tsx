import React, { useEffect, useState, useCallback } from "react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { saveColorPreference } from "./save_color_preference";
import { saveSupportInfo } from "./save_support_info";
import { uploadToCloudinary } from "./cloudinary.api";
import { saveImageURLs } from "./save_image_urls";
import { saveEmailGatePreference } from "./save_email_gate_preference";
import { getShopStatus } from "./get_shop_status";
import { ActionResponse } from "../common/types/index";
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
  RadioButton,
} from "@shopify/polaris";
import SetupStepper from "../components/SetupStepper";

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5"];

interface SettingsData {
  session: { shop: string };
  setupCompleted: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { setup_completed } = await getShopStatus(session.shop);
  return json({ session, setupCompleted: setup_completed });
};

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shopId = session.shop;
  const intent = formData.get("intent");

  if (!shopId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    switch (intent) {
      case "saveAllSettings":
        const color = formData.get("color") as string;
        const supportEmail = formData.get("supportEmail") as string;
        const supportPhone = formData.get("supportPhone") as string;
        const emailGatePrefString = formData.get("emailGatePreference") as string;
        const imageUrl = formData.get("imageUrl") as string;

        if (!color || !supportEmail || !supportPhone || !emailGatePrefString || !imageUrl) {
          return json({ error: "All fields are required and must be filled out." }, { status: 400 });
        }
        
        await saveColorPreference(shopId, color);
        await saveSupportInfo(shopId, supportEmail, supportPhone);
        const showEmailGate = emailGatePrefString === "true";
        await saveEmailGatePreference(shopId, { show_email_gate: showEmailGate });
        await saveImageURLs(shopId, imageUrl);
        return json({ success: true });

      case "saveColor":
        const colorOnly = formData.get("color") as string;
        if (!colorOnly) return json({ error: "Color is required." }, { status: 400 });
        await saveColorPreference(shopId, colorOnly);
        return json({ success: true, intent: 'saveColor' });

      case "saveSupport":
        const supportEmailOnly = formData.get("supportEmail") as string;
        const supportPhoneOnly = formData.get("supportPhone") as string;
        if (!supportEmailOnly || !supportPhoneOnly) return json({ error: "Support email and phone are required." }, { status: 400 });
        await saveSupportInfo(shopId, supportEmailOnly, supportPhoneOnly);
        return json({ success: true, intent: 'saveSupport' });
      
      case "saveEmailGatePref":
        const emailGatePref = formData.get("emailGatePreference") as string;
        if (emailGatePref === null) return json({ error: "Email gate preference is required." }, { status: 400 });
        const showEmailGatePref = emailGatePref === "true";
        await saveEmailGatePreference(shopId, { show_email_gate: showEmailGatePref });
        return json({ success: true, intent: 'saveEmailGatePref' });

      case "saveImage":
        const imageUrlOnly = formData.get("imageUrl") as string;
        if (!imageUrlOnly) return json({ error: "Image URL is required." }, { status: 400 });
        await saveImageURLs(shopId, imageUrlOnly);
        return json({ success: true, intent: 'saveImage' });
        
      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in settings action for intent '${intent}':`, error);
    return json({ error: "Failed to save settings. Please try again." }, { status: 500 });
  }
};

export default function Settings() {
  const { session, setupCompleted } = useLoaderData<SettingsData>();
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emailGatePreference, setEmailGatePreference] = useState("false");
  
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if(session?.shop) {
      localStorage.setItem("shopId", session.shop);
    }
  }, [session]);

  useEffect(() => {
    if (setupCompleted) return;

    const allFieldsFilled = 
      !!selectedColor && 
      !!supportEmail && 
      !!supportPhone && 
      !!uploadedImage;
    setIsFormValid(allFieldsFilled);
  }, [selectedColor, supportEmail, supportPhone, uploadedImage, setupCompleted]);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
        if (!setupCompleted) {
          navigate('/app/training');
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else if (fetcher.data?.error) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => setShowErrorBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data, navigate, setupCompleted]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleEmailGatePrefChange = useCallback((value: string) => {
    setEmailGatePreference(value);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setUploading(true);
    const imageUrl = await uploadToCloudinary(file);
    if (imageUrl) {
      setUploadedImage(imageUrl);
    }
    setUploading(false);
  };
  
  const handleSaveSettings = () => {
    if (!setupCompleted && (!isFormValid || !selectedColor || !uploadedImage)) return;

    fetcher.submit(
      {
        intent: "saveAllSettings",
        color: selectedColor,
        supportEmail,
        supportPhone,
        emailGatePreference,
        imageUrl: uploadedImage,
      },
      { method: "post" }
    );
  };

  const handleSaveColor = () => {
    if (selectedColor) {
      fetcher.submit({ color: selectedColor, intent: "saveColor" }, { method: "post" });
    }
  };

  const handleSaveSupportInfo = () => {
    if (supportEmail && supportPhone) {
      fetcher.submit({ supportEmail, supportPhone, intent: "saveSupport" }, { method: "post" });
    }
  };

  const handleSaveEmailGatePreference = () => {
    fetcher.submit({ emailGatePreference, intent: "saveEmailGatePref" }, { method: "post" });
  };

  const handleSaveImage = () => {
    if (uploadedImage) {
      fetcher.submit({ imageUrl: uploadedImage, intent: "saveImage" }, { method: "post" });
    }
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page>
      <SetupStepper currentStep={0} setupCompleted={setupCompleted} />
      <BlockStack gap="500">
        {showSuccessBanner && (
          <Banner
            title="Settings saved successfully!"
            tone="success"
            onDismiss={() => setShowSuccessBanner(false)}
          >
            {!setupCompleted && <p>Redirecting you to the next step...</p>}
          </Banner>
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
                      Select a color{!setupCompleted && " (Required)"}:
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
                {setupCompleted && (
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={handleSaveColor}
                      disabled={!selectedColor || isLoading}
                      loading={isLoading && fetcher.formData?.get('intent') === 'saveColor'}
                    >
                      Save Color
                    </Button>
                  </InlineStack>
                )}
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
                  <Text as="h2" variant="headingLg">
                    Email Gate Settings
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Choose whether to display an email collection gate before users can interact with the chatbot.{!setupCompleted && " (Required)"}
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <RadioButton
                    label="Show Email Gate to users"
                    checked={emailGatePreference === "true"}
                    id="showEmailGateTrue"
                    name="emailGateDisplayPreference"
                    onChange={() => handleEmailGatePrefChange("true")}
                  />
                  <RadioButton
                    label="Do not show Email Gate (allow direct access to chat)"
                    checked={emailGatePreference === "false"}
                    id="showEmailGateFalse"
                    name="emailGateDisplayPreference"
                    onChange={() => handleEmailGatePrefChange("false")}
                  />
                </BlockStack>
                {setupCompleted && (
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={handleSaveEmailGatePreference}
                      loading={isLoading && fetcher.formData?.get('intent') === 'saveEmailGatePref'}
                    >
                      Save Email Gate Setting
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About Email Gate
                </Text>
                <Text as="p" variant="bodyMd">
                  Enabling the Email Gate helps you collect user emails for marketing and support. 
                  Disabling it allows users to start chatting immediately without providing an email.
                </Text>
                 <Text as="p" variant="bodyMd">
                  This preference is stored per shop and affects all users of the chatbot on this shop.
                </Text>
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
                    Provide your support email and phone number so your customers can contact you if needed.{!setupCompleted && " (Required)"}
                  </Text>
                </BlockStack>

                <BlockStack gap="300">
                  <TextField
                    label="Support Email"
                    type="email"
                    value={supportEmail}
                    onChange={(value) => setSupportEmail(value)}
                    autoComplete="email"
                    requiredIndicator={!setupCompleted}
                  />
                  <TextField
                    label="Support Phone Number"
                    type="tel"
                    value={supportPhone}
                    onChange={(value) => setSupportPhone(value)}
                    autoComplete="tel"
                    requiredIndicator={!setupCompleted}
                  />
                </BlockStack>
                {setupCompleted && (
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={handleSaveSupportInfo}
                      disabled={!supportEmail || !supportPhone || isLoading}
                      loading={isLoading && fetcher.formData?.get('intent') === 'saveSupport'}
                    >
                      Save Support Info
                    </Button>
                  </InlineStack>
                )}
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
                    Upload custom image to personalize your chatbot's toggle button and header appearance.{!setupCompleted && " (Required)"}
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
                    {uploading && <p>Uploading...</p>}
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
                {setupCompleted && (
                  <InlineStack gap="200" align="start">
                    <Button
                      variant="primary"
                      onClick={handleSaveImage}
                      disabled={!uploadedImage || uploading || isLoading}
                      loading={uploading || (isLoading && fetcher.formData?.get('intent') === 'saveImage')}
                    >
                      {uploading ? "Uploading..." : "Save Image"}
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {!setupCompleted && (
          <Card>
              <BlockStack gap="300">
                  <Text as="h2" variant="headingLg">Complete Setup</Text>
                  <Text as="p" variant="bodyMd">
                      Please fill out all the required fields on this page to proceed. Once all fields are complete, you can save and continue to the next step.
                  </Text>
                  <Button
                      variant="primary"
                      size="large"
                      onClick={handleSaveSettings}
                      disabled={!isFormValid || isLoading}
                      loading={isLoading}
                  >
                      Save and Continue
                  </Button>
              </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}