import type { CSSProperties } from 'react';

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

export interface ChatResponse {
  answer: string;
  products: Product[];
  history: Message[];
}

export interface LocationInfo {
  country: string | null;
  city: string | null;
  region: string | null;
}

export interface SessionData {
  email: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  session_start: string;
  interactions: number;
  total_chat_interactions: number;
  products_added_to_cart: number;
  cart_items: any[];
}

export interface ShopifyCartResponse {
  token: string;
  items: Array<{
    id: number;
    quantity: number;
    title: string;
    price: number;
    image: string;
    properties: Record<string, any>;
  }>;
  item_count: number;
}

export interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

export interface CartProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onCheckout: () => Promise<void>;
  primaryColor: string;
}

export interface ChatbotProps {
  config: ChatbotConfig;
}

export interface ChatbotToggleProps {
  isOpen: boolean;
  storeImage: string;
  primaryColor: string;
  onClick: () => void;
}

export interface ChatHeaderProps {
  storeImage: string;
  onToggleCart: () => void;
  cartItemCount: number; 
  primaryColor: string;
  showCartIcon?: boolean;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  primaryColor: string;
}

export interface EmailGateProps {
  config: ChatbotConfig;
  onSubmit: (email: string) => Promise<void>;
  onSkip: () => Promise<void>;
}

export interface ErrorPopupProps {
  message: string;
  onClose: () => void;
}

export interface MessageProps {
  message: Message;
  primaryColor?: string;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  primaryColor: string;
}

export interface ProductProps {
  product: Product;
  onAddToCart: (product: Product) => Promise<void>;
  primaryColor?: string;
}

export interface ProductSliderProps {
  products: Product[];
  onAddToCart: (product: Product) => Promise<void>;
  primaryColor?: string;
}

export interface TypingIndicatorProps {
  primaryColor: string;
}