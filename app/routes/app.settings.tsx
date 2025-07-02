import React, { useEffect, useState, useCallback } from "react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { DeleteIcon, PlusIcon } from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import { saveColorPreference } from "./save_color_preference";
import { saveSupportInfo } from "./save_support_info";
import { uploadToCloudinary } from "./cloudinary.api";
import { saveImageURLs } from "./save_image_urls";
import { saveEmailGatePreference } from "./save_email_gate_preference";
import { getShopStatus } from "./get_shop_status";
import { getShopSettings } from "./get_shop_settings";
import { saveQuickReplies } from "./save_quick_replies";
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
import { API } from "../constants/api.constants";

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
    quick_replies?: string[];
  };
  countryCodes: Array<{label: string, value: string}>;
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { setup_completed } = await getShopStatus(session.shop);
  let settings = {};
  let countryCodes: Array<{label: string, value: string}> = [];

  try {
    const response = await fetch(`${API.COUNTRY_CODES}`);
    if (response.ok) {
      countryCodes = await response.json();
    }
  } catch (error) {
    console.error("Failed to load country codes:", error);
  }

  if (setup_completed) {
    try {
      settings = await getShopSettings(session.shop);
    } catch (error) {
      console.error("Failed to load shop settings:", error);
    }
  }
  return json({ session, setupCompleted: setup_completed, settings, countryCodes });
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
        const quickRepliesValue = formData.get("quickReplies") as string;

        if (!color || !supportEmail || !supportPhone || !countryCodeValue || !emailGatePrefString || !imageUrl || !quickRepliesValue) {
          return json({ error: "All fields are required and must be filled out." }, { status: 400 });
        }

        const quickRepliesParsed  = JSON.parse(quickRepliesValue);
        if (quickRepliesParsed.length > 5) {
          return json({ error: "Maximum 5 quick replies allowed." }, { status: 400 });
        }
        
        const countryCode = countryCodeValue.split('_')[0];
        await saveColorPreference(shopId, color);
        await saveSupportInfo(shopId, supportEmail, supportPhone, countryCode);
        const showEmailGate = emailGatePrefString === "true";
        await saveEmailGatePreference(shopId, { show_email_gate: showEmailGate });
        await saveImageURLs(shopId, imageUrl);
        await saveQuickReplies(shopId, quickRepliesParsed);
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

      case "saveQuickReplies":
        const quickReplies = formData.get("quickReplies") as string;
        if (!quickReplies) return json({ error: "Quick replies are required." }, { status: 400 });
        const parsedQuickReplies = JSON.parse(quickReplies);
        if (parsedQuickReplies.length > 5) {
          return json({ error: "Maximum 5 quick replies allowed." }, { status: 400 });
        }
        await saveQuickReplies(shopId, parsedQuickReplies);
        return json({ success: true });
        
      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in settings action for intent '${intent}':`, error);
    return json({ error: "Failed to save settings. Please try again." }, { status: 500 });
  }
};

export default function Settings() {
  const { session, setupCompleted, settings, countryCodes = [] } = useLoaderData<SettingsData>();
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();

  const [settingDetails, setSettingDetails] = useState(() => {
    const initialCountryCode =
      countryCodes.find(c => c.value.startsWith(settings?.support_country_code || ''))?.value ||
      countryCodes.find(c => c.value.startsWith('+1'))?.value ||
      (countryCodes.length > 0 ? countryCodes[0].value : '');
    
    return {
      selectedColor: settings?.preferred_color || null,
      supportEmail: settings?.support_email || "",
      supportPhone: settings?.support_phone || "",
      countryCode: initialCountryCode,
      uploadedImage: settings?.image || null,
      emailGatePreference:
        settings?.show_email_gate !== undefined ? String(settings.show_email_gate) : "false",
    };
  });

  const [uploading, setUploading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>(
    settings?.quick_replies || []
  );

  useEffect(() => {
    if(session?.shop) {
      localStorage.setItem("shopId", session.shop);
    }
  }, [session]);

  useEffect(() => {
    if (setupCompleted) return;

    const { selectedColor, supportEmail, supportPhone, uploadedImage } = settingDetails;
    const nonEmptyReplies = quickReplies.filter(reply => reply.trim() !== "");

    const allFieldsFilled = 
      !!selectedColor && 
      !!supportEmail && 
      !!supportPhone && 
      !!uploadedImage &&
      nonEmptyReplies.length > 0;

    setIsFormValid(allFieldsFilled);
  }, [settingDetails, setupCompleted, quickReplies]);

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
    const { selectedColor, uploadedImage, supportEmail, supportPhone, countryCode, 
      emailGatePreference 
    } = settingDetails;

    const nonEmptyReplies = quickReplies.filter(reply => reply.trim() !== "");

    if (!setupCompleted && (!isFormValid || !selectedColor || !uploadedImage || !countryCode || 
      !emailGatePreference || nonEmptyReplies.length === 0)) return;

    if (!validateEmail(supportEmail) || !validatePhone(supportPhone)) return;

    fetcher.submit(
      {
        intent: "saveAllSettings",
        color: selectedColor,
        supportEmail,
        supportPhone,
        countryCode,
        emailGatePreference,
        imageUrl: uploadedImage,
        quickReplies: JSON.stringify(nonEmptyReplies),
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
    if (!validatePhone(supportPhone) || !validateEmail(supportEmail)) return;
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

    if (cleaned.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits");
      return false;
    }

    setPhoneError("");
    return true;
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    handleStateChange('supportPhone', value);
    validatePhone(value);
  };

  const handleSupportEmailChange = (value: string) => {
    handleStateChange('supportEmail', value);
    validateEmail(value);
  };

  const handleCountryCodeChange = (value: string) => {
      handleStateChange('countryCode', value);
  };

  const handleQuickReplyChange = (index: number, value: string) => {
    const newQuickReplies = [...quickReplies];
    newQuickReplies[index] = value;
    setQuickReplies(newQuickReplies);
  };

  const handleAddQuickReply = () => {
    if (quickReplies.length < 5) {
      setQuickReplies([...quickReplies, ""]);
    }
  };

  const handleRemoveQuickReply = (index: number) => {
    const newQuickReplies = [...quickReplies];
    newQuickReplies.splice(index, 1);
    setQuickReplies(newQuickReplies);
  };

  const handleSaveQuickReplies = () => {
    const nonEmptyReplies = quickReplies.filter(reply => reply.trim() !== "");
    if (nonEmptyReplies.length === 0) {
      setShowErrorBanner(true);
      return;
    }
    fetcher.submit(
      {
        intent: "saveQuickReplies",
        quickReplies: JSON.stringify(nonEmptyReplies),
      },
      { method: "post" }
    );
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
                      <Tooltip content="Choose a custom color" preferredPosition="above">
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "1px solid #DDD",
                          position: 'relative',
                          backgroundColor: settingDetails.selectedColor && !colors.includes(settingDetails.selectedColor) 
                            ? settingDetails.selectedColor 
                            : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                            position: 'relative'
                          }}>
                          <input
                            type="color"
                            value={settingDetails.selectedColor || '#ffffff'}
                            onChange={(e) => handleColorSelect(e.target.value)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            aria-label="Select custom color"
                          />
                          </div>
                        </div>
                      </Tooltip>
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
                    Quick Replies Settings{!setupCompleted && " (Required)"}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Set up to 5 quick reply suggestions that will be displayed in a scrollable slider at the 
                    bottom of the chat interface. These help users quickly ask common questions.
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Example: "What's your return policy?", "When will my order ship?"
                  </Text>
                </BlockStack>
                        
                <Box 
                  padding="400" 
                  background="bg-surface-secondary" 
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="400">
                    {quickReplies.length === 0 ? (
                      <Box
                        padding="400"
                        background="bg-surface"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor="border"
                      >
                        <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                          No quick replies added yet
                        </Text>
                      </Box>
                    ) : (
                      quickReplies.map((reply, index) => (
                        <Box 
                          key={index}
                          padding="400"
                          background="bg-surface"
                          borderRadius="200"
                          borderWidth="025"
                          borderColor="border"
                        >
                          <InlineStack gap="200" align="center" blockAlign="center">
                            <Box width="100%">
                              <TextField
                                label={`Quick Reply ${index + 1}`}
                                value={reply}
                                onChange={(value) => handleQuickReplyChange(index, value)}
                                autoComplete="off"
                                multiline={2}
                                placeholder="Enter a suggested question for users..."
                                requiredIndicator={!setupCompleted}
                              />
                            </Box>
                            <Button
                              tone="critical"
                              onClick={() => handleRemoveQuickReply(index)}
                              disabled={quickReplies.length <= 1}
                              icon={DeleteIcon}
                              variant="plain"
                            />
                          </InlineStack>
                        </Box>
                      ))
                    )}
          
                    {quickReplies.length < 5 && (
                      <Button 
                        onClick={handleAddQuickReply}
                        variant="primary"
                        tone="success"
                        disabled={quickReplies.some(reply => reply.trim() === "")}
                        icon={PlusIcon}
                        fullWidth
                      >
                        Add Quick Reply
                      </Button>
                    )}
                  </BlockStack>
                </Box>
                  
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={handleSaveQuickReplies}
                    disabled={quickReplies.length === 0 || quickReplies.some(reply => reply.trim() === "") || isLoading}
                    loading={isLoading && fetcher.formData?.get('intent') === 'saveQuickReplies'}
                  >
                    Save Quick Replies
                  </Button>
                </InlineStack>
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
                    error={emailError}
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
                        disabled={countryCodes.length === 0}
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