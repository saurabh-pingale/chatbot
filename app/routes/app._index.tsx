import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Icon,
  TextField,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  return { success: true };
};

export default function ChatbotIndex() {
  const fetcher = useFetcher<typeof action>();
  const [demoQuestion, setDemoQuestion] = useState("");
  const [demoResponse, setDemoResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleDemoSubmit = () => {
    if (!demoQuestion.trim()) return;
    
    setIsTyping(true);

    setTimeout(() => {
      setDemoResponse("This is a sample response from your AI-powered chatbot. In the actual implementation, this would be generated based on your trained vectors.");
      setIsTyping(false);
    }, 1500);
  };

  const features = [
    "Trained with specialized vectors for accurate responses",
    "Answers product-specific questions instantly",
    "Reduces customer support workload",
    "Improves customer satisfaction with 24/7 availability",
    "Customizable to match your brand voice"
  ];

  const exampleQuestions = [
    "How do I track my order?",
    "What's your return policy?",
    "Are there any active promotions?",
    "Do you ship internationally?",
    "How can I contact customer support?"
  ];

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingLg">
                      AI-Powered Chatbot
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    Your store's intelligent assistant, powered by AI and trained with specialized vectors to provide accurate, helpful responses to your customers.
                  </Text>
                </BlockStack>

                <Banner title="Ready to assist your customers" status="success">
                  Your chatbot is active and ready to help your customers with their questions.
                </Banner>

                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Try it out
                  </Text>
                  <Card>
                    <BlockStack gap="400">
                      <TextField
                        label="Ask a question"
                        value={demoQuestion}
                        onChange={setDemoQuestion}
                        placeholder="Type a question to see how the chatbot responds..."
                        connectedRight={
                          <Button onClick={handleDemoSubmit} disabled={!demoQuestion.trim()}>
                            Ask
                          </Button>
                        }
                      />
                      
                      {(isTyping || demoResponse) && (
                        <Box
                          padding="400"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderRadius="200"
                          borderColor="border"
                        >
                          {isTyping ? (
                            <Text as="p">Typing...</Text>
                          ) : (
                            <Text as="p">{demoResponse}</Text>
                          )}
                        </Box>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>

                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    How it works
                  </Text>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">1</Text>
                    </Box>
                    <Text as="p">Customer asks a question through the chat interface</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">2</Text>
                    </Box>
                    <Text as="p">AI processes the question using trained vectors</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">3</Text>
                    </Box>
                    <Text as="p">AI generates an accurate, helpful response</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingMd">
                      Key Features
                    </Text>
                  </InlineStack>
                  <List type="bullet">
                    {features.map((feature, index) => (
                      <List.Item key={index}>{feature}</List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="center" gap="200">
                    <Text as="h2" variant="headingMd">
                      Example Questions
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    Your chatbot can handle questions like:
                  </Text>
                  <List type="bullet">
                    {exampleQuestions.map((question, index) => (
                      <List.Item key={index}>{question}</List.Item>
                    ))}
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}