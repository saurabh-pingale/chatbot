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
import { getShopSettings } from "./get_shop_settings";
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
  Spinner,
  Select
} from "@shopify/polaris";
import SetupStepper from "../components/SetupStepper";

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5"];

interface SettingsData {
  session: { shop: string };
  setupCompleted: boolean;
  settings?: {
    preferred_color?: string;
    support_email?: string;
    support_phone?: string;
    support_country_code?: string;
    image?: string;
    show_email_gate?: boolean;
  };
}

const countryCodes = [
  { label: "United States (+1)", value: "+1_us" },
  { label: "United Kingdom (+44)", value: "+44_gb" },
  { label: "Canada (+1)", value: "+1_ca" },
  { label: "Australia (+61)", value: "+61_au" },
  { label: "India (+91)", value: "+91_in" }
];

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { setup_completed } = await getShopStatus(session.shop);
  let settings = {};
  if (setup_completed) {
    try {
      settings = await getShopSettings(session.shop);
    } catch (error) {
      console.error("Failed to load shop settings:", error);
    }
  }
  return json({ session, setupCompleted: setup_completed, settings });
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
        const countryCodeValue = formData.get("countryCode") as string;
        const emailGatePrefString = formData.get("emailGatePreference") as string;
        const imageUrl = formData.get("imageUrl") as string;

        if (!color || !supportEmail || !supportPhone || !countryCodeValue || !emailGatePrefString || !imageUrl) {
          return json({ error: "All fields are required and must be filled out." }, { status: 400 });
        }
        
        const countryCode = countryCodeValue.split('_')[0];
        await saveColorPreference(shopId, color);
        await saveSupportInfo(shopId, supportEmail, supportPhone, countryCode);
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
        const countryCodeOnlyValue = formData.get("countryCode") as string;

        if (!supportEmailOnly || !supportPhoneOnly) return json({ error: "Support email and phone are required." }, { status: 400 });
        const countryCodeOnly = countryCodeOnlyValue.split('_')[0];
        await saveSupportInfo(shopId, supportEmailOnly, supportPhoneOnly, countryCodeOnly);
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
  const { session, setupCompleted, settings } = useLoaderData<SettingsData>();
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();

  const [settingDetails, setSettingDetails] = useState({
    selectedColor: settings?.preferred_color || null,
    supportEmail: settings?.support_email || "",
    supportPhone: settings?.support_phone || "",
    countryCode:
      countryCodes.find(c => c.value.startsWith(settings?.support_country_code || '+1'))?.value || "+1_us",
    uploadedImage: settings?.image || null,
    emailGatePreference:
      settings?.show_email_gate !== undefined ? String(settings.show_email_gate) : "false",
  });

  const [uploading, setUploading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if(session?.shop) {
      localStorage.setItem("shopId", session.shop);
    }
  }, [session]);

  useEffect(() => {
    if (setupCompleted) return;

    const { selectedColor, supportEmail, supportPhone, uploadedImage } = settingDetails;
    const allFieldsFilled = 
      !!selectedColor && 
      !!supportEmail && 
      !!supportPhone && 
      !!uploadedImage;
    setIsFormValid(allFieldsFilled);
  }, [settingDetails, setupCompleted]);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccessBanner(true);
      if (!setupCompleted) {
        setIsRedirecting(true);
        const timer = setTimeout(() => {
          navigate("/app/training");
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setShowSuccessBanner(false), 2000);
        return () => clearTimeout(timer);
      }
    } else if (fetcher.data?.error) {
      setShowErrorBanner(true);
      const timer = setTimeout(() => setShowErrorBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data, navigate, setupCompleted]);

  const handleStateChange = (field: string, value: any) => {
    setSettingDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleColorSelect = (color: string) => {
    handleStateChange('selectedColor', color);
  };

  const handleEmailGatePrefChange = useCallback((value: string) => {
    handleStateChange('emailGatePreference', value);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setUploading(true);
    const imageUrl = await uploadToCloudinary(file);
    if (imageUrl) {
      handleStateChange('uploadedImage', imageUrl);
    }
    setUploading(false);
  };
  
  const handleSaveSettings = () => {
    const { selectedColor, uploadedImage } = settingDetails;
    if (!setupCompleted && (!isFormValid || !selectedColor || !uploadedImage)) return;

    fetcher.submit(
      {
        intent: "saveAllSettings",
        ...settingDetails
      },
      { method: "post" }
    );
  };

  const handleSaveColor = () => {
    if (settingDetails.selectedColor) {
      fetcher.submit({ color: settingDetails.selectedColor, intent: "saveColor" }, { method: "post" });
    }
  };

  const handleSaveSupportInfo = () => {
    const { supportEmail, supportPhone, countryCode } = settingDetails;
    if (!validatePhone(supportPhone)) return;
    if (supportEmail && supportPhone) {
      fetcher.submit({ supportEmail, supportPhone, countryCode, intent: "saveSupport" }, { method: "post" });
    }
  };

  const handleSaveEmailGatePreference = () => {
    fetcher.submit({ emailGatePreference: settingDetails.emailGatePreference, intent: "saveEmailGatePref" }, { method: "post" });
  };

  const handleSaveImage = () => {
    if (settingDetails.uploadedImage) {
      fetcher.submit({ imageUrl: settingDetails.uploadedImage, intent: "saveImage" }, { method: "post" });
    }
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[\s-]/g, '');
    if (!/^[\d\s-]+$/.test(phone)) {
      setPhoneError("Phone number should contain only digits, spaces, or hyphens");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    handleStateChange('supportPhone', value);
    validatePhone(value);
  };

  const handleSupportEmailChange = (value: string) => {
    handleStateChange('supportEmail', value);
  };

  const handleCountryCodeChange = (value: string) => {
      handleStateChange('countryCode', value);
  };

  const isLoading = fetcher.state !== "idle" || isRedirecting || uploading;

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
                              border: settingDetails.selectedColor === color ? "3px solid #000" : "1px solid #DDD",
                              cursor: "pointer",
                              padding: 0,
                              transition: "transform 0.2s ease",
                              transform: settingDetails.selectedColor === color ? "scale(1.1)" : "scale(1)",
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
                      disabled={!settingDetails.selectedColor || isLoading}
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
                    checked={settingDetails.emailGatePreference === "true"}
                    id="showEmailGateTrue"
                    name="emailGateDisplayPreference"
                    onChange={() => handleEmailGatePrefChange("true")}
                  />
                  <RadioButton
                    label="Do not show Email Gate (allow direct access to chat)"
                    checked={settingDetails.emailGatePreference === "false"}
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
                    value={settingDetails.supportEmail}
                    onChange={handleSupportEmailChange}
                    autoComplete="email"
                    requiredIndicator={!setupCompleted}
                  />
          
                  <TextField
                    label="Support Phone Number"
                    type="tel"
                    value={settingDetails.supportPhone}
                    onChange={handlePhoneChange}
                    autoComplete="tel"
                    requiredIndicator={!setupCompleted}
                    error={phoneError}
                    connectedLeft={
                      <Select
                        label="Country Code"
                        labelHidden
                        options={countryCodes}
                        onChange={handleCountryCodeChange}
                        value={settingDetails.countryCode}
                      />
                    }
                  />
                  
                </BlockStack>
                {setupCompleted && (
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={handleSaveSupportInfo}
                      disabled={!settingDetails.supportEmail || !settingDetails.supportPhone || isLoading}
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
                    {settingDetails.uploadedImage && (
                      <Box paddingBlockStart="300">
                        <img
                          src={settingDetails.uploadedImage}
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
                      disabled={!settingDetails.uploadedImage || uploading || isLoading}
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