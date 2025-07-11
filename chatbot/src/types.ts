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
  categories?: string[];
  success?: boolean;
  error?: string | null;
  limit_reached?: boolean;
  tags?: string[]; 
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
  showCartIcon: boolean;
  onToggleOffers: () => void;
  showOffersIcon: boolean;
  isOffersPopupOpen: boolean;
  onCloseOffers: () => void;
  offerTags: string[];
  onOfferClick: (tag: string) => void;
  onClearConversation?: () => void;  
  showClearConversationIcon:boolean; 
  onMinimize: () => void;  
}

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
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
  primaryColor: string;
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  primaryColor: string;
  onProductAddToCart?: (product: ProductType) => Promise<void>;
  tags?: TagItem[];
  handleSendMessage: (tag: string) => void;
  categories?: string[];
}

export interface ProductProps {
  product: ProductType;
  onAddToCart: (product: ProductType) => Promise<void>;
  primaryColor: string;
}

export interface ProductSliderProps {
  products: ProductType[];
  onAddToCart?: (product: ProductType) => Promise<void>;
  primaryColor: string;
}

export interface TypingIndicatorProps {
  primaryColor?: string;
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
  location_info?: LocationInfo; 
}

export interface OffersPopupProps {
  isOpen: boolean;
  onClose: () => void;
  offerTags: string[];
  primaryColor: string;
  onOfferClick: (tag: string) => void;
}

export interface ChatBodyProps {
  messages: Message[];
  isTyping: boolean;
  config: ChatbotAppConfig;
  handleSendMessage: (text: string) => void;
  jwtToken: string | null;
  isEmailGateVisible?: boolean;
  handleError: (error: string) => void;
  isChatLimitReached?: boolean;
  tags?: TagItem[];
  categories?: string[];
}

export interface CartBodyProps {
  id: string;
  name: string;
  image_url: string;
  price: number;
  quantity: number;
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