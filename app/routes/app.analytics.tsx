import React, { useEffect, useState } from 'react';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Grid,
  LegacyCard, 
} from "@shopify/polaris";
import { API } from '../constants/api.constants';
import { authenticate } from '../shopify.server';
import { AnalyticsSummaryData, LoaderData } from '../common/types';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session?.shop) {
    return json({ shop: null});
  }

  return json({ 
    shop: session.shop
  });
};  

export default function AnalyticsPage() {
  const { shop } = useLoaderData<LoaderData>();
  const [data, setData] = useState<AnalyticsSummaryData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleFetchAnalytics = async () => {
    if (!shop) {
      setFetchError("Shop information is not available. Cannot fetch analytics.");
      setData({ total_users: 0, total_chat_interactions: 0, error: "Shop information missing." });
      return;
    }
    try {
      const apiUrl = `${API.GET_ANALYTICS}?shopId=${encodeURIComponent(shop)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: `Failed to fetch analytics data: ${response.status}` }));
        const errorMessage = errorBody.detail || `Failed to fetch analytics. Status: ${response.status}.`;
        console.error("Analytics fetch error:", errorMessage, errorBody);
        setFetchError(errorMessage);
        setData({ total_users: 0, total_chat_interactions: 0, error: errorMessage });
        return;
      }

      const analyticsData: AnalyticsSummaryData = await response.json();
      setData(analyticsData);
      if (analyticsData.error) {
        setFetchError(analyticsData.error);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching analytics.";
      console.error("Error fetching analytics data:", error);
      setFetchError(errorMessage);
      setData({ total_users: 0, total_chat_interactions: 0, error: errorMessage });
    }
  };

  useEffect(() => {
    handleFetchAnalytics();
  }, [shop]);

  if (!data && !fetchError) {
    return (
      <Page title="Chatbot Analytics">
          <Text variant="bodyMd" as="p">Loading analytics...</Text>
      </Page>
    );
  }

  if (data?.error || fetchError) {
    return (
      <Page title="Chatbot Analytics">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Analytics Error</Text>
                <Text as="p" tone="critical">{data?.error || fetchError}</Text>
                <Text as="p">Please ensure the application is correctly configured or try again later.</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  if (data && !data.error) {
    return (
      <Page title="Chatbot Analytics">
        <BlockStack gap="500">
          <Text variant="headingXl" as="h1">
            Chatbot Performance Overview
          </Text>

          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Users" sectioned>
                <Text variant="heading2xl" as="p">
                  {data.total_users?.toLocaleString() || '0'}
                </Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Chat Interactions" sectioned>
                <Text variant="heading2xl" as="p">
                  {data.total_chat_interactions?.toLocaleString() || '0'}
                </Text>
              </LegacyCard>
            </Grid.Cell>
          </Grid>
          
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page title="Chatbot Analytics">
        <Text variant="bodyMd" as="p">Unable to display analytics data at this time.</Text>
    </Page>
  );
} 