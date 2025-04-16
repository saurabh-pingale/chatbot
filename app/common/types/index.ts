export interface LoaderData {
  session? :{
    shop?: string;
  };
};

export interface ChatbotToggleButtonProps {
    isOpen: boolean;
    onToggle: () => void;
    color: string | null;
};

export interface ChatbotWindowProps {
  onClose: () => void;
  color: string | null;
}

export interface Product {
  title: string;
  price: string;
  image: string;
  url: string;
}

export interface Message {
  text: string;
  sender: 'user' | 'bot';
  products?: Product[];
  categories?: string[]; 
}

export interface InputComponentProps {
  onSendMessage: (message: string) => void;
  color: string | null;
};

export interface Messages {
  text: string;
  sender: 'user' | 'bot';
  products?: Array<{ title: string; price: string; image: string; url: string }>;
  categories?: string[];
}

export interface MessageListProps {
  messages: Messages[];
  color?: string | null;
  onSendMessage: (message: string) => void;
};
  
export interface ProductSliderProps {
  products: Product[];
  color: string | null;
};

export interface StaticSliderProps {
  color: string | null;
  onSelectOption: (option: string) => void;
};

export interface ProductCardProps {
  product: Product;
  color?: string | null;
};

export interface DeepSeekResponse {
  answer: string;
  products?: Product[];
  categories?: string[]; 
}

export interface TypingLoaderProps {
  color?: string | null;
}

export interface CategoryButtonsProps {
  categories: string[];
  color?: string;
  onSelectCategory: (category: string) => void;
}

export interface SliderOptionProps {
  onClick: (option: string) => void;
}

export interface LeftSliderButtonProps {
  onClick: () => void;
  color: string;
}

export interface RightSliderButtonProps {
  onClick: () => void;
  color: string;
}

export interface LoaderData {
  shop: string; 
  accessToken: string;
}

export interface FetcherResponse {
  answer: string;
}