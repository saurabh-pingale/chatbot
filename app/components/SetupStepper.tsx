import React from "react";
import { Box, Text, InlineStack } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

interface SetupStepperProps {
  currentStep: number;
  setupCompleted: boolean;
}

const stepStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer'
};

const circleStyles: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#dfe3e8',
    color: '#454f5b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginBottom: '8px',
    border: '2px solid #dfe3e8',
};

const activeCircleStyles: React.CSSProperties = {
    borderColor: '#5a67d8',
    backgroundColor: '#fff',
};

const completedCircleStyles: React.CSSProperties = {
    backgroundColor: '#5a67d8',
    color: '#fff',
    borderColor: '#5a67d8',
};

const lineStyles: React.CSSProperties = {
    flexGrow: 1,
    height: '2px',
    backgroundColor: '#dfe3e8',
    margin: '0 16px',
    alignSelf: 'center'
};


export default function SetupStepper({ currentStep, setupCompleted }: SetupStepperProps) {
  if (setupCompleted) {
    return null;
  }
  
  const navigate = useNavigate();
  const steps = [
    { label: "Configure Settings", path: "/app/settings" },
    { label: "Train Chatbot", path: "/app/training" },
    // TODO: Uncomment when pricing flow is automated completely
    // { label: "Select Plan", path: "/app/billing" },
  ];

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < steps.length) {
        navigate(steps[stepIndex].path);
    }
  }

  return (
    <Box paddingBlockEnd="500">
        <Text as="h2" variant="headingMd" alignment="center">Complete Your Setup</Text>
        <Box paddingBlockStart="400">
            <InlineStack gap="0" align="center" blockAlign="start" wrap={false}>
                {steps.map((step, index) => (
                    <React.Fragment key={step.label}>
                        <div style={stepStyles} onClick={() => handleStepClick(index)}>
                            <div style={{
                                ...circleStyles,
                                ...(index === currentStep ? activeCircleStyles : {}),
                                ...(index < currentStep ? completedCircleStyles : {})
                            }}>
                                {index < currentStep ? '✓' : index + 1}
                            </div>
                            <Text variant="bodyMd" as="p">{step.label}</Text>
                        </div>
                        {index < steps.length - 1 && <div style={lineStyles}></div>}
                    </React.Fragment>
                ))}
            </InlineStack>
        </Box>
    </Box>
  );
} 