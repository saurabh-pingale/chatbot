import { Spinner, Text, BlockStack, Box } from "@shopify/polaris";
import React from "react";

export function StatusPopup() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Box 
        padding="500" 
        paddingInline="800"
        background="bg-surface" 
        borderRadius="300" 
        shadow="300"
        borderColor="border"
        borderWidth="025"
        borderStyle="solid"
        minWidth="320px"
      >
        <BlockStack gap="400" inlineAlign="center">
          <Spinner accessibilityLabel="Connecting to server..." size="large" color="primary" />
          <Text as="h2" variant="headingLg">
            Connecting...
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Please wait while we establish a connection.
          </Text>
        </BlockStack>
      </Box>
    </div>
  );
}