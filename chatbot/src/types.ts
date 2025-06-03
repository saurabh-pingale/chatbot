import type { CSSProperties } from 'react';

export interface ProductType {
  id: string | number;
  name: string;
  price: number | string;
  image_url?: string;
  description?: string;
  category?: string;
  variant_id?: string;
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  products?: ProductType[];
}

export interface CartItem extends ProductType {
  quantity: number;
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
  products?: ProductType[];
  categories?: string[];
  success?: boolean;
  error?: string | null;
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
  cart_items: CartItem[];
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
  [key: `--${string}`]: string | number | undefined;
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
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  primaryColor?: string;
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export interface ProductProps {
  product: ProductType;
  onAddToCart: (product: ProductType) => Promise<void>;
  primaryColor?: string;
}

export interface ProductSliderProps {
  products: ProductType[];
  onAddToCart?: (product: ProductType) => Promise<void>;
  primaryColor?: string;
}

export interface TypingIndicatorProps {
  primaryColor?: string;
}

export interface ExtendedMessageProps extends MessageProps {
    onProductAddToCart?: (product: ProductType) => Promise<void>;
}