export interface LoaderData {
  session? :{
    shop?: string;
  };
};

export interface LoaderData {
  shop: string; 
  accessToken: string;
}

export interface FetcherResponse {
  answer: string;
}

export interface ActionResponse {
  success?: boolean;
  error?: string;
  color?: string;
};

export interface AnalyticsSummaryData {
  summary: {
    total_users?: number;
    total_chat_interactions?: number;
    total_opened_chatbot?: number;
    total_added_to_cart?: number;
    total_purchased?: number;
    total_purchase_amount?: number;
  };
  timeseries: {
    granularity: 'daily' | 'hourly' | 'minutely';
    data: { timestamp: number; count: number }[];
  };
  error?: string;
};

export interface SaveEmailGatePreferencePayload {
  show_email_gate: boolean;
}