export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface ChatbotConfig {
  shopId: string;
  storeImage: string;
  primaryColor: string;
} 

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem extends Product {
  title: string;
  quantity: number;
  variant_id?: string;
}

export interface ChatbotConfig {
  primaryColor: string;
  storeImage: string;
  shopId: string;
}

export interface UserSession {
  email?: string;
  hasSubmittedEmail: boolean;
}

declare global {
  interface Window {
    Shopify?: {
      shop: string;
    };
  }
} 