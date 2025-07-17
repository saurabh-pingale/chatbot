import { createContext, useContext, type ReactNode } from 'react';
import type { ChatbotAppConfig } from '../types';

export const ConfigContext = createContext<ChatbotAppConfig | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
  value: ChatbotAppConfig | null;
}

export const ConfigProvider = ({ children, value }: ConfigProviderProps) => {
  return (
    <ConfigContext.Provider value={value}>
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
      throw new Error('Configuration not yet loaded or available. Ensure the component is rendered only after config is fetched.');
  }

  return context;
};