import React, { useState, useCallback, useEffect } from "react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Modal,
  TextField,
  Banner,
  InlineStack,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import SetupStepper from "../components/SetupStepper";
import { savePlanDetails } from "./save_plan_details";
import { getShopStatus } from "./get_shop_status";

interface ActionResponse {
  success?: boolean;
  error?: string;
}

interface BillingLoaderData {
    shop: string;
    setupCompleted: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { setup_completed } = await getShopStatus(session.shop);
  return json({ shop: session.shop, setupCompleted: setup_completed });
};

export const action: ActionFunction = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const shopId = session.shop;

    const intent = formData.get("intent");

    if (intent === "savePlan") {
        const plan = formData.get("plan") as string;
        const ownerName = formData.get("ownerName") as string;
        const ownerEmail = formData.get("ownerEmail") as string;
        const ownerLocation = formData.get("ownerLocation") as string;

        if (!shopId || !plan || !ownerName || !ownerEmail || !ownerLocation) {
            return json({ error: "Missing required fields" }, { status: 400 });
        }
        
        try {
            await savePlanDetails(shopId, { 
                owner_name: ownerName, 
                owner_email: ownerEmail,
                owner_location: ownerLocation,
                plan 
            });
            return json({ success: true });
        } catch (error) {
            console.error("Failed to save plan details:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return json({ error: errorMessage }, { status: 500 });
        }
    }

    return json({ error: "Invalid intent" }, { status: 400 });
};


export default function BillingPage() {
  const { shop, setupCompleted } = useLoaderData<BillingLoaderData>();
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [ownerDetails, setOwnerDetails] = useState({ name: "", email: "", location: "" });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
        setActiveModal(null);
        setShowSuccessBanner(true);
        setIsRedirecting(true);
        setTimeout(() => {
            setShowSuccessBanner(false);
            navigate('/app');
        }, 3000);
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const handlePlanSelection = (plan: string) => {
    setSelectedPlan(plan);
    if (plan === "Free") {
      setActiveModal("freeTrial");
    } else {
      setActiveModal("payment");
    }
  };

  const handleOwnerDetailsChange = (field: string, value: string) => {
    setOwnerDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePlan = () => {
    if (selectedPlan && ownerDetails.name && ownerDetails.email && ownerDetails.location) {
        fetcher.submit(
            { 
                plan: selectedPlan,
                ownerName: ownerDetails.name,
                ownerEmail: ownerDetails.email,
                ownerLocation: ownerDetails.location,
                intent: "savePlan"
            },
            { method: "post" }
        );
    }
  };
  
  const startFreeTrial = () => {
    setActiveModal('ownerDetails');
  }

  const plans = [
    { name: "Free Trial", price: "$0/month", features: ["30-day trial", "Basic support", "100 conversations"], action: () => handlePlanSelection("Free") },
    { name: "Medium Trial", price: "$29/month", features: ["Priority support", "1000 conversations", "Advanced analytics"], action: () => handlePlanSelection("Medium") },
    { name: "Pro Trial", price: "$99/month", features: ["24/7 support", "Unlimited conversations", "Custom branding"], action: () => handlePlanSelection("Pro") },
  ];

  const isOwnerDetailsValid = ownerDetails.name && ownerDetails.email && ownerDetails.location;
  const isLoading = fetcher.state !== "idle" || isRedirecting;

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
          <Spinner accessibilityLabel="Processing..." />
        </div>
      )}
      <SetupStepper currentStep={2} setupCompleted={setupCompleted} />
      <BlockStack gap="500">
        <Layout>
            {showSuccessBanner && (
              <Layout.Section>
                <Banner title="Plan activated successfully! Redirecting..." tone="success" onDismiss={() => setShowSuccessBanner(false)} />
              </Layout.Section>
            )}
          <Layout.Section>
            <BlockStack gap="500">
                <Card>
                    <BlockStack gap="200">
                        <Text as="h2" variant="headingLg">Choose Your Plan</Text>
                        <Text variant="bodyMd" as="p">Select a plan that fits your needs. You can upgrade or downgrade at any time.</Text>
                    </BlockStack>
                </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
        <Layout>
          {plans.map((plan) => (
            <Layout.Section key={plan.name} variant="oneThird">
              <Card>
                <BlockStack gap="400" inlineAlign="stretch">
                  <Text as="h3" variant="headingMd">{plan.name}</Text>
                  <Text as="p" variant="bodyLg">{plan.price}</Text>
                  <BlockStack gap="200">
                    {plan.features.map((feature, i) => <Text key={i} as="p">{feature}</Text>)}
                  </BlockStack>
                  <div style={{ marginTop: 'auto' }}>
                    <Button variant="primary" onClick={plan.action}>Start {plan.name}</Button>
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </BlockStack>

      <Modal
        open={activeModal === 'freeTrial'}
        onClose={() => setActiveModal(null)}
        title="Start Your Free Trial"
        primaryAction={{ content: 'Confirm', onAction: startFreeTrial }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setActiveModal(null) }]}
      >
        <Modal.Section>
          <Text as="p">Your free trial will be valid for 30 days. After the trial, you can choose a paid plan to continue service.</Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
        title="Payment Required"
        primaryAction={{ content: 'Proceed to Payment', onAction: () => setActiveModal('ownerDetails') }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setActiveModal(null) }]}
      >
        <Modal.Section>
          <Text as="p">To start your {selectedPlan} plan, please proceed to payment.</Text>
        </Modal.Section>
      </Modal>

        <Modal
            open={activeModal === 'ownerDetails'}
            onClose={() => setActiveModal(null)}
            title="Store Owner Details"
            primaryAction={{ content: 'Save and Start Plan', onAction: handleSavePlan, disabled: !isOwnerDetailsValid }}
            secondaryActions={[{ content: 'Cancel', onAction: () => setActiveModal(null) }]}
        >
            <Modal.Section>
                <BlockStack gap="300">
                    <TextField label="Name" value={ownerDetails.name} onChange={(value) => handleOwnerDetailsChange('name', value)} autoComplete="name" requiredIndicator />
                    <TextField label="Email" type="email" value={ownerDetails.email} onChange={(value) => handleOwnerDetailsChange('email', value)} autoComplete="email" requiredIndicator />
                    <TextField label="Location" value={ownerDetails.location} onChange={(value) => handleOwnerDetailsChange('location', value)} autoComplete="address-line1" requiredIndicator />
                </BlockStack>
            </Modal.Section>
        </Modal>

    </Page>
  );
} 