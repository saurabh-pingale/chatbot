export interface VectorMetadata {
    text: string;
    label?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface Vector {
    id: string;
    values: number[];
    metadata?: VectorMetadata;
  }
  
  export interface ShopifyProduct {
    id: string;
    title: string;
    description: string;
    [key: string]: any;
  }
  
  export interface ProductEmbedding {
    id: string;
    values: number[];
    metadata: { text: string; [key: string]: any };
  }
  
  export interface DeepseekRequestBody {
    messages: { content: string }[];
    isTrainingPage?: boolean;
    shopifyStore?: string;
    shopifyAccessToken?: string;
  }