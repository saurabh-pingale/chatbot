import React, { useEffect, useState } from 'react';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  List,
  Grid,
  LegacyCard, 
} from "@shopify/polaris";
import { API } from '../constants/api.constants';
import { authenticate } from '../shopify.server';
import { LoaderData } from '../common/types';

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
  const [data, setData] = useState<any>(null);

  const handleFetchAnalytics = async () => {
    try {
      const apiUrl = `${API.GET_ANALYTICS}/?shopId=${encodeURIComponent(shop)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch analytics data: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch analytics. Status: ${response.status}. Please try again later.`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setData({
          totalChatInteractions: 0,
          uniqueUsers: 0,
          userLocations: [],
          productsAddedToCart: 0,
          totalPurchasesCount: 0,
          totalPurchaseValue: 0,
          topPurchasedProducts: [],
          error: error instanceof Error ? error.message : "An unknown error occurred while fetching analytics."
      });
    }
  };

  useEffect(() => {
    handleFetchAnalytics();
  }, []);

  if(!data) {
    return null;
  }

  if (data.error) {
    return (
      <Page title="Chatbot Analytics">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Analytics Error</Text>
                <Text as="p" tone="critical">{data.error}</Text>
                <Text as="p">Please ensure the application is correctly configured or try again later.</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Chatbot Analytics">
      <BlockStack gap="500">
        <Text variant="headingXl" as="h1">
          Chatbot Performance Overview
        </Text>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <LegacyCard title="Total Chat Interactions" sectioned>
              <Text variant="heading2xl" as="p">
                {data.totalChatInteractions?.toLocaleString() || '0'}
              </Text>
            </LegacyCard>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <LegacyCard title="Unique Users Engaged" sectioned>
              <Text variant="heading2xl" as="p">
                {data.uniqueUsers?.toLocaleString() || '0'}
              </Text>
            </LegacyCard>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <LegacyCard title="Products Added to Cart" sectioned>
              <Text variant="heading2xl" as="p">
                {data.productsAddedToCart?.toLocaleString() || '0'}
              </Text>
            </LegacyCard>
          </Grid.Cell>
           <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <LegacyCard title="Total Purchases via Chatbot" sectioned>
              <Text variant="heading2xl" as="p">
                {data.totalPurchasesCount?.toLocaleString() || '0'}
              </Text>
            </LegacyCard>
          </Grid.Cell>
        </Grid>
        
        <LegacyCard title="Total Purchase Value">
          <LegacyCard.Section>
             <Text variant="heading2xl" as="p" alignment="center">
                ${(data.totalPurchaseValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
          </LegacyCard.Section>
        </LegacyCard>


        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  User Locations (Top 5)
                </Text>
                {data.userLocations && data.userLocations.length > 0 ? (
                  <List type="bullet">
                    {data.userLocations.map((loc, index) => (
                      <List.Item key={index}>
                        {loc.country || 'N/A'} ({loc.city || 'N/A'}): {loc.count.toLocaleString()} users
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <Text as="p">No user location data available.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Top Purchased Products (Top 5 by Revenue)
                </Text>
                {data.topPurchasedProducts && data.topPurchasedProducts.length > 0 ? (
                  <List>
                    {data.topPurchasedProducts.map((product) => (
                      <List.Item key={product.id}>
                        <BlockStack gap="100">
                           <Text variant="bodyMd" fontWeight="bold" as="span">{product.name}</Text>
                           <Text variant="bodySm" as="p">
                             Quantity: {product.quantity.toLocaleString()} | Revenue: ${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </Text>
                        </BlockStack>
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <Text as="p">No top purchase data available yet.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        {/* <BlockStack gap="200">
            <Text variant="bodySm" as="p" tone="subdued">
                Note: This data is periodically updated. For real-time granular logs, please refer to the event store (if applicable).
            </Text>
        </BlockStack> */}

      </BlockStack>
    </Page>
  );
} 