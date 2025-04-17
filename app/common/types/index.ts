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