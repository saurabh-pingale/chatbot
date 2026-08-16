import React, { useEffect, useRef } from "react";
import { BlockStack, Card, Text } from "@shopify/polaris";
import ChatResultList from "./ChatResultList";
import type { ChatFlowStep, ChatMessage, ChatSuggestion } from "../utils/chat-flow.utils";

interface ChatSearchSectionProps {
  messages: ChatMessage[];
  suggestions: ChatSuggestion[];
  chatStep: ChatFlowStep;
  isLoading: boolean;
  isSyncing: boolean;
  isFetchingCategory: boolean;
  configMissing: boolean;
  categoriesCount: number;
  onSuggestion: (suggestion: ChatSuggestion) => Promise<void> | void;
}

export default function ChatSearchSection({
  messages,
  suggestions,
  chatStep,
  isLoading,
  isSyncing,
  isFetchingCategory,
  configMissing,
  categoriesCount,
  onSuggestion,
}: ChatSearchSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showLoading = isLoading || isSyncing;
  const suggestionsDisabled = configMissing || showLoading || isFetchingCategory;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions, isFetchingCategory]);

  const helperText =
    chatStep === "welcome"
      ? "Start with a greeting to see your store categories."
      : chatStep === "categories"
        ? categoriesCount
          ? "Choose a category to view every product in it."
          : "Sync products first to unlock category browsing."
        : "Explore another category or browse everything again.";

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            ReezoAI Assist
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Browse your synced Shopify catalog through guided suggestions — just like a storefront chatbot.
          </Text>
        </BlockStack>

        <div
          ref={scrollRef}
          style={{
            minHeight: 320,
            maxHeight: 520,
            overflowY: "auto",
            padding: "12px 8px",
            borderRadius: 12,
            background: "linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)",
            border: "1px solid rgba(15, 23, 42, 0.06)",
          }}
        >
          <ChatResultList
            messages={messages}
            showLoading={showLoading}
            isSyncing={isSyncing}
            isFetchingCategory={isFetchingCategory}
            suggestions={suggestions}
            suggestionsDisabled={suggestionsDisabled}
            onSuggestion={onSuggestion}
            helperText={helperText}
          />
        </div>
      </BlockStack>
    </Card>
  );
}
