import React, { useEffect, useState, useCallback } from 'react';
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
  DatePicker,
  Popover,
  Button,
  TextField,
  LegacyStack,
  Spinner,
} from "@shopify/polaris";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [isLoading, setIsLoading] = useState(true);
  
  const today = new Date();

  const [dateRange, setDateRange] = useState({
    start: today,
    end: today,
  });
  const [{month, year}, setDate] = useState({month: dateRange.start.getMonth(), year: dateRange.start.getFullYear()});
  const [popoverActive, setPopoverActive] = useState(false);

  const handleDateRangeChange = useCallback(
    (range) => setDateRange(range),
    [],
  );

  const handleMonthChange = useCallback(
    (month, year) => setDate({month, year}),
    [],
  );

  const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);

  const handleFetchAnalytics = useCallback(async (start: Date, end: Date) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      if (!shop) {
        throw new Error("Shop information is not available. Cannot fetch analytics.");
      }
      
      const startDate = start.toISOString();
      const endDate = end.toISOString();
      const apiUrl = `${API.GET_ANALYTICS}?shopId=${encodeURIComponent(shop)}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: `Failed to fetch analytics data: ${response.status}` }));
        throw new Error(errorBody.detail || `Failed to fetch analytics. Status: ${response.status}.`);
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
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    handleFetchAnalytics(dateRange.start, dateRange.end);
  }, [shop, dateRange, handleFetchAnalytics]);
  
  const chartData = data?.daily_opened_chatbot?.map(item => {
    const localDate = new Date(item.date + 'T00:00:00');
    return {
      date: localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.count,
    };
  }) || [];
  
  const formattedStartDate = dateRange.start.toLocaleDateString();
  const formattedEndDate = dateRange.end.toLocaleDateString();

  const setDatePreset = (preset: 'today' | 'week' | 'month') => {
      const end = new Date();
      let start = new Date();
      if (preset === 'week') {
          start.setDate(end.getDate() - 7);
      } else if (preset === 'month') {
          start.setMonth(end.getMonth() - 1);
      }
      setDateRange({ start, end });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
      <LegacyCard sectioned>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
          <Spinner accessibilityLabel="Loading analytics data" size="large" />
        </div>
      </LegacyCard>
    );
  }
    if (fetchError) {
    return (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Analytics Error</Text>
            <Text as="p" tone="critical">{fetchError}</Text>
                <Text as="p">Please ensure the application is correctly configured or try again later.</Text>
              </BlockStack>
            </Card>
    );
  }
    if (data) {
    return (
        <BlockStack gap="500">
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Users" sectioned>
                <Text variant="heading2xl" as="p">{data.total_users?.toLocaleString() || '0'}</Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Chat Interactions" sectioned>
                <Text variant="heading2xl" as="p">{data.total_chat_interactions?.toLocaleString() || '0'}</Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Chatbot Opens" sectioned>
                <Text variant="heading2xl" as="p">{data.total_opened_chatbot?.toLocaleString() || '0'}</Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Products Added to Cart" sectioned>
                <Text variant="heading2xl" as="p">{data.total_added_to_cart?.toLocaleString() || '0'}</Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Purchases" sectioned>
                <Text variant="heading2xl" as="p">{data.total_purchased?.toLocaleString() || '0'}</Text>
              </LegacyCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <LegacyCard title="Total Purchase Amount" sectioned>
                <Text variant="heading2xl" as="p">${data.total_purchase_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</Text>
              </LegacyCard>
            </Grid.Cell>
          </Grid>
          <LegacyCard title="Chatbot Engagement" sectioned>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={20} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Chatbot Opens" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </LegacyCard>
        </BlockStack>
    );
    }
    return null;
  }

  return (
    <Page title="Chatbot Analytics" subtitle="A summary of your chatbot's performance.">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Filter by Date</Text>
                <LegacyStack>
                  <LegacyStack.Item fill>
                      <Popover
                          active={popoverActive}
                          activator={
                            <Button onClick={togglePopoverActive} fullWidth>
                              From: {formattedStartDate} | To: {formattedEndDate}
                            </Button>
                          }
                          onClose={togglePopoverActive}
                          sectioned
                      >
                          <DatePicker
                              month={month}
                              year={year}
                              onChange={handleDateRangeChange}
                              onMonthChange={handleMonthChange}
                              selected={dateRange}
                              allowRange
                          />
                      </Popover>
                  </LegacyStack.Item>
                  <Button onClick={() => setDatePreset('today')}>Today</Button>
                  <Button onClick={() => setDatePreset('week')}>Last 7 days</Button>
                  <Button onClick={() => setDatePreset('month')}>Last 30 days</Button>
                </LegacyStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          {renderContent()}
        </Layout.Section>
      </Layout>
    </Page>
  );
} 