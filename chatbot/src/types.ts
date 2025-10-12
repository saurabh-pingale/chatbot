import type { CSSProperties } from 'react';

export interface ProductType {
  id: string | number;
  name: string;
  price: number | string;
  url?: string;
  image_url?: string;
  description?: string;
  category?: string;
  variant_id?: string;
  variant_quantity: number;
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  products?: ProductType[];
  tags?: TagItem[];
}

export interface CartItem extends ProductType {
  quantity: number;
  variant_quantity: number;
}

export interface ChatbotAppConfig {
  primaryColor: string;
  storeImage: string;
  shopId: string;
  showEmailGate: boolean;
  setupCompleted: boolean;
  allowGuestMode: boolean;
}

export interface ChatbotConfig {
  primaryColor: string;
  storeImage: string;
  shopId: string;
  greetingMessage?: string;
  displayShopLogo?: boolean;
  shopLogoUrl?: string;
  emailGateMessage?: string;
  emailInputPlaceholder?: string;
  emailLoadingText?: string;
  emailContinueButtonText?: string;
  allowGuestMode: boolean;
  emailSkipButtonText?: string;
  showEmailGate: boolean;
  setupCompleted: boolean;
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
  success?: boolean;
  error?: string | null;
  limit_reached?: boolean;
  tags?: TagItem[];
}

export interface LocationInfo {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  ip?: string | null;
}

export interface AnalyticsData {
  email: string;
  ip: string;
  country: string | null;
  city: string | null;
  region: string | null;
  session_start: string;
  session_end?: string;
  interactions: number;
  total_chat_interactions: number;
  products_added_to_cart: number;
  cart_items: CartItem[];
  products_purchased: number;
  total_purchase_value: number;
  purchased_items: PurchasedItem[];
  is_anonymous?: boolean;
  shop_id?: string;
}

export interface PurchasedItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

type ShopifyPropertyValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ShopifyPropertyValue }
  | ShopifyPropertyValue[];

export interface ShopifyCartResponse {
  token: string;
  items: Array<{
    id: number;
    quantity: number;
    title: string;
    price: number;
    image: string;
    properties: Record<string, ShopifyPropertyValue>;
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
}

export interface ChatbotToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export interface ChatHeaderProps {
  onClearConversation?: () => void;
  onMinimize: () => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  isEmailGateVisible: boolean;
  messagesCount: number;
}

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export interface EmailGateProps {
  onSuccess: (token: string) => void;
}

export interface ErrorPopupProps {
  message: string;
  onClose: () => void;
}

export interface MessageProps {
  message: Message;
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onProductAddToCart?: (product: ProductType) => Promise<void>;
  tags: TagItem[];
  handleSendMessage: (tag: string) => void;
}

export interface ProductProps {
  product: ProductType;
  onAddToCart: (product: ProductType) => Promise<void>;
}

export interface ProductSliderProps {
  products: ProductType[];
  onAddToCart?: (product: ProductType) => Promise<void>;
}

export interface ExtendedMessageProps extends MessageProps {
    onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export interface InitiateSessionRequest {
  email: string;
  shopId: string;
  utm_params?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  } | null;
}

export interface InitiateSessionResponse {
  token: string;
}

export interface AgentConversationRequestPayload {
  messages: Message[];
  token?: string;
}

export interface OffersPopupProps {
  isOpen: boolean;
  onClose: () => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface ChatBodyProps {
  jwtToken: string | null;
  setError: (error: string | null) => void;
  isEmailGateVisible: boolean;
  onMessagesCountChange: (count: number) => void;
}

export interface ChatBodyHandle {
  clearConversation: () => void;
}

export interface CartBodyProps {
  id: string;
  name: string;
  image_url: string;
  price: number;
  quantity: number;
  availableQty: number;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  dynamicStyles: StyleWithCustomProps;
}

export interface MinusIconProps {
  dynamicStyles: StyleWithCustomProps;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  id: string;
  quantity: number;
}

export interface PlusIconProps {
  dynamicStyles: StyleWithCustomProps;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  id: string;
  quantity: number;
  availableQty: number;
}

export interface AnalyticsSummaryData {
  total_users: number;
  total_chat_interactions: number;
  total_opened_chatbot: number;
  total_added_to_cart: number;
  total_purchased: number;
  total_purchase_amount: number;
  error?: string;
}

export interface LoaderData {
  shop: string | null;
} 

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface NotificationPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export type TagItem = {
  name: string;
  description: string;
};

export interface ChatbotTagsProps {
  tags?: { name: string }[];
  isTyping: boolean;
  primaryColor?: string;
  onClick: (tagName: string) => void;
}

export interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  hasError: boolean;
  style: StyleWithCustomProps;
  onContinue: () => void;
  isLoading: boolean;
}

export interface OtpInputProps {
  onOtpChange: (otp: string) => void;
  disabled: boolean;
  hasError: boolean;
  style: React.CSSProperties;
  onVerify: () => void;
  onRequestAgain: () => void;
  isLoading: boolean;
}

export interface Offer {
  id: number;
  tag: string;
  product: Record<string, any>; 
}