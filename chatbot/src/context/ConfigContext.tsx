import { createContext, useContext, type ReactNode } from 'react';
import { CHATBOT_DEFAULTS } from '../constants/chatbot.defaults';
import { CHATBOT_LOGO_DATA_URI } from '../assets/ChatbotLogo';
import type { ChatbotAppConfig } from '../types';

const DEFAULT_CONFIG: ChatbotAppConfig = {
  primaryColor: CHATBOT_DEFAULTS.primaryColor,
  logoUrl: CHATBOT_LOGO_DATA_URI,
  headerTitle: CHATBOT_DEFAULTS.headerTitle,
  greetingMessage: CHATBOT_DEFAULTS.greetingMessage,
  helloButtonLabel: CHATBOT_DEFAULTS.helloButtonLabel,
  fallbackMessage: CHATBOT_DEFAULTS.fallbackMessage,
  shopId: CHATBOT_DEFAULTS.shopId,
  showEmailGate: CHATBOT_DEFAULTS.showEmailGate,
  setupCompleted: CHATBOT_DEFAULTS.setupCompleted,
  allowGuestMode: CHATBOT_DEFAULTS.allowGuestMode,
  storeImage: CHATBOT_LOGO_DATA_URI,
};

export const ConfigContext = createContext<ChatbotAppConfig | null>(DEFAULT_CONFIG);

interface ConfigProviderProps {
  children: ReactNode;
  value: ChatbotAppConfig | null;
}

export const ConfigProvider = ({ children, value }: ConfigProviderProps) => {
  const merged = value ? { ...DEFAULT_CONFIG, ...value } : DEFAULT_CONFIG;
  return (
    <ConfigContext.Provider value={merged}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);

  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }

  if (context === null) {
    throw new Error(
      'Configuration not yet loaded. Ensure the component is rendered only after config is fetched.',
    );
  }

  return context;
};
