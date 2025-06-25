import React, { useState, useEffect } from "react";
import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Modal,
  Banner,
  Spinner,
  List,
  InlineStack,
  Grid,
  Badge,
  Icon,
  Box,
  Divider,
} from "@shopify/polaris";
import { CheckIcon, CreditCardIcon, StarIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import SetupStepper from "../components/SetupStepper";
import { getShopStatus } from "./get_shop_status";
import { API } from "../constants/api.constants";

interface BillingLoaderData {
    shop: string;
    setupCompleted: boolean;
    plan: string | null;
  subscriptionStatus: string | null;
  endDate: string | null;
}

const getBadgeTone = (status: string | null): "success" | "critical" | "info" | undefined => {
    switch(status) {
        case 'active':
        case 'trialing':
            return 'success';
        case 'canceled':
            return 'critical';
        default:
            return 'info';
    }
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { plan, setup_completed, subscription_status, end_date } = await getShopStatus(session.shop);
  return json({
    shop: session.shop,
    setupCompleted: setup_completed,
    plan,
    subscriptionStatus: subscription_status,
    endDate: end_date,
  });
};

export default function BillingPage() {
  const { shop, setupCompleted, plan, subscriptionStatus, endDate } = useLoaderData<BillingLoaderData>();

  const [isLoading, setIsLoading] = useState(false);
  const [isCancelModalOpen, setCancelModalOpen] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePlanSelection = async (selectedPlan: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API.BACKEND_URL}/subscriptions/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, shop_domain: shop }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to create checkout session");
      }
      if (data.checkout_url) {
        window.top!.location.href = data.checkout_url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterpriseContact = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API.BACKEND_URL}/subscriptions/contact-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shop }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send contact request");
      }
      setSuccessMessage(data.message);
      setSuccessModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelModalOpen(false);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API.BACKEND_URL}/subscriptions/cancel-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_domain: shop }),
      });
      const data = await response.json();
      if (!response.ok) {
          throw new Error(data.detail || "Failed to cancel subscription");
      }
      setSuccessMessage(data.message);
      window.location.reload(); 
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const plans = [
    { 
      name: "Free Trial", 
      price: "$0", 
      period: "30 days",
      description: "Perfect for getting started",
      features: ["30-day trial", "Basic support", "100 conversations"], 
      action: () => alert("Free trial not implemented yet"), 
      value: "Free",
      highlight: false,
      badge: null
    },
    { 
      name: "Plus", 
      price: "$99", 
      period: "per month",
      description: "Everything you need to scale",
      features: ["24/7 support", "Unlimited conversations", "Custom branding"], 
      action: () => handlePlanSelection("Plus"), 
      value: "Plus",
      highlight: true,
      badge: "MOST POPULAR"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "billed annually",
      description: "For large-scale businesses with custom needs",
      features: ["Everything in Plus", "Dedicated Account Manager", "Custom Integrations", "Service Level Agreement (SLA)"],
      action: handleEnterpriseContact,
      value: "Enterprise",
      highlight: false,
      badge: null
    }
  ];

  const displayedPlans = (plan && plan !== 'Free')
    ? plans.filter(p => p.value !== 'Free')
    : plans;

  const renderCurrentPlanBanner = () => {
    if (plan && subscriptionStatus) {
      return (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <Box>
                  <Icon source={CreditCardIcon} tone="subdued" />
                </Box>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">Current Subscription</Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodyLg" fontWeight="semibold">{plan} Plan</Text>
                    <Badge tone={getBadgeTone(subscriptionStatus)} size="small">{subscriptionStatus}</Badge>
                  </InlineStack>
                </BlockStack>
              </InlineStack>
              {subscriptionStatus === 'active' && (
                <Text as="p" variant="bodyMd" tone="subdued">
                  {endDate && `Next billing: ${new Date(endDate).toLocaleDateString()}`}
                </Text>
              )}
            </InlineStack>
            {subscriptionStatus === 'canceled' && endDate && (
              <>
                <Divider />
                <Banner tone="info" title="Subscription Canceled">
                  Your subscription will end on {new Date(endDate).toLocaleDateString()}. You'll continue to have access until then.
                </Banner>
              </>
            )}
          </BlockStack>
        </Card>
      );
    }
    return null;
  };

  const renderPlanSelection = () => (
    <BlockStack gap="600">
      <BlockStack gap="200" inlineAlign="center">
        <Text as="h2" variant="headingXl" alignment="center">Choose Your Plan</Text>
        <Text variant="bodyLg" as="p" tone="subdued" alignment="center">
          Select the perfect plan for your business. Upgrade or downgrade anytime.
        </Text>
      </BlockStack>
      
      <Grid>
        {displayedPlans.map((planItem) => (
          <Grid.Cell key={planItem.name} columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
              <div style={{ 
                position: 'relative', 
                height: '100%',
                transform: planItem.highlight ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.2s ease-in-out'
              }}>
                  {planItem.badge && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '-12px', 
                        right: '16px', 
                        zIndex: 1,
                        background: '#1a73e8',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                          {planItem.badge}
                      </div>
                  )}
                  <Card>
                      <div style={{ 
                        padding: '24px',
                        background: 'transparent',
                        borderRadius: '0',
                        border: 'none'
                      }}>
                        <BlockStack gap="500">
                            <BlockStack gap="300" inlineAlign="center">
                              <BlockStack gap="100" inlineAlign="center">
                                <Text as="h3" variant="headingLg" fontWeight="bold">{planItem.name}</Text>
                                <Text as="p" variant="bodyMd" tone="subdued">{planItem.description}</Text>
                              </BlockStack>
                              <BlockStack gap="100" inlineAlign="center">
                                <InlineStack gap="100" blockAlign="baseline">
                                  <Text as="span" variant="heading2xl" fontWeight="bold">
                                    {planItem.price}
                                  </Text>
                                  <Text as="span" variant="bodyMd" tone="subdued">
                                    {planItem.period}
                                  </Text>
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>
                            
                            <Divider />
                            
                            <BlockStack gap="300">
                                <Text as="h4" variant="headingSm" fontWeight="semibold">What's included:</Text>
                                <BlockStack gap="200">
                                    {planItem.features.map((feature, i) => (
                                        <InlineStack key={i} gap="200" blockAlign="start" wrap={false}>
                                            <Box minWidth="20px">
                                              <Icon source={CheckIcon} tone="success" />
                                            </Box>
                                            <Text as="span" variant="bodyMd">{feature}</Text>
                                        </InlineStack>
                                    ))}
                                </BlockStack>
                            </BlockStack>

                            <div style={{ paddingTop: '16px' }} />
                            
                            {planItem.value === plan ? (
                                <Button
                                    fullWidth
                                    size="large"
                                    tone="critical"
                                    onClick={() => setCancelModalOpen(true)}
                                    disabled={subscriptionStatus === 'canceled'}
                                >
                                    {subscriptionStatus === 'canceled' ? 'Plan Canceled' : 'Cancel Subscription'}
                                </Button>
                            ) : (
                                <Button 
                                    fullWidth
                                    variant={planItem.highlight ? "primary" : "secondary"} 
                                    onClick={planItem.action}
                                    size="large"
                                    tone={planItem.highlight ? "success" : undefined}
                                >
                                    {
                                      planItem.value === 'Free' ? 'Start Free Trial' : 
                                      planItem.value === 'Enterprise' ? 'Contact Us' :
                                      `Upgrade to ${planItem.name}`
                                    }
                                </Button>
                            )}
                        </BlockStack>
                      </div>
                  </Card>
              </div>
          </Grid.Cell>
        ))}
      </Grid>
    </BlockStack>
  );

  return (
    <Page>
      {isLoading && (
        <div style={{ 
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.9)", 
          backdropFilter: "blur(4px)",
          zIndex: 999, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <BlockStack gap="300" inlineAlign="center">
            <Spinner size="large" />
            <Text as="p" variant="bodyMd" tone="subdued">Processing your request...</Text>
          </BlockStack>
        </div>
      )}
      
      <SetupStepper currentStep={2} setupCompleted={setupCompleted} />

      <BlockStack gap="500">
        <Layout>
            {successMessage && (
              <Layout.Section>
                <Banner title="Success!" tone="success" onDismiss={() => setSuccessMessage(null)}>
                  {successMessage}
                </Banner>
              </Layout.Section>
            )}
            {error && (
              <Layout.Section>
                <Banner title="Something went wrong" tone="critical" onDismiss={() => setError(null)}>
                  {error}
                </Banner>
              </Layout.Section>
            )}
            
            {renderCurrentPlanBanner() && (
          <Layout.Section>
                {renderCurrentPlanBanner()}
          </Layout.Section>
            )}
            
            <Layout.Section>
              {renderPlanSelection()}
            </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={isSuccessModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Request Received!"
        primaryAction={{
          content: 'Got It!',
          onAction: () => setSuccessModalOpen(false),
        }}
      >
        <Modal.Section>
          <Banner tone="success" onDismiss={() => {}}>
            <p>{successMessage}</p>
          </Banner>
        </Modal.Section>
      </Modal>

      <Modal
        open={isCancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription"
        primaryAction={{ 
          content: 'Confirm Cancellation', 
          onAction: handleCancelSubscription, 
          destructive: true 
        }}
        secondaryActions={[{ 
          content: 'Keep Subscription', 
          onAction: () => setCancelModalOpen(false) 
        }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p" variant="bodyMd">
              Are you sure you want to cancel your subscription? This action cannot be undone.
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Your subscription will remain active until the end of the current billing period, 
              and you'll continue to have access to all features until then.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
} 