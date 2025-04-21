import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  List,
  InlineStack,
  Banner,
} from "@shopify/polaris";

export default function ChatbotIndex() {

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

                <Banner title="Ready to assist your customers" tone="success">
                  Your chatbot is active and ready to help your customers with their questions.
                </Banner>
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
                    <Text as="p">Chatbot using Advanced Artifical Intelligence</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">3</Text>
                    </Box>
                    <Text as="p">ChatBot processes the question using trained data</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">4</Text>
                    </Box>
                    <Text as="p">ChatBot helps in get latest products</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">5</Text>
                    </Box>
                    <Text as="p">ChatBot helps in get latest orders requests</Text>
                  </InlineStack>
                  <InlineStack wrap={false} gap="500">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="100px">
                      <Text as="p" variant="headingMd" alignment="center">6</Text>
                    </Box>
                    <Text as="p">ChatBot helps in boost sales</Text>
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