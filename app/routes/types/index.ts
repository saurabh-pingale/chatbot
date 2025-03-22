export interface VectorMetadata {
    text: string;
    label?: string;
    createdAt?: Date;
    updatedAt?: Date;
    title?: string;
    description?: string;
    url?: string;
    price?: string;
    image?: string;
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
  url: string;
  price: string;
  image: string;
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

export interface ActionResponse {
  success?: boolean;
  error?: string;
  color?: string;
};