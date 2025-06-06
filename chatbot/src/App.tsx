import { useEffect, useState } from 'react';
import { Chatbot } from './components/Chatbot/Chatbot';
import { getStoreColor, getStoreImage, getEmailGatePreference, getShopStatus } from './services/chat';
import { getShopId } from './utils/utils';
import type { ChatbotAppConfig } from './types';

function App() {
  const [config, setConfig] = useState<null | ChatbotAppConfig>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const shopId = getShopId();

      const [status, color, image, showEmailGate] = await Promise.all([
        getShopStatus(),
        getStoreColor(), 
        getStoreImage(), 
        getEmailGatePreference(),
      ]);
      
      setConfig({
        setupCompleted: status.setupCompleted,
        primaryColor: color,
        storeImage: image,
        shopId: shopId || 'demo-shop',
        showEmailGate: showEmailGate,
      });
    } catch (error) {
      console.error("Failed to fetch configuration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoading) {
    return null;
  }

  const popupStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    maxWidth: '300px',
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'white',
    border: '1px solid #e1e3e5',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 10px 0',
    color: '#202223'
  };

  if (!config) {
    return (
      <div style={popupStyles}>
        <div style={cardStyles}>
            <h2 style={titleStyles}>Chatbot Error</h2>
            <p style={{color: 'black'}}>Could not load chatbot configuration.</p>
        </div>
      </div>
    );
  }

  if (!config.setupCompleted) {
    return (
      <div style={popupStyles}>
        <div style={cardStyles}>
            <h2 style={titleStyles}>Chatbot Status</h2>
            <p style={{color: 'black'}}>
                Please complete the chatbot setup in your Shopify admin panel to enable it for your customers.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Chatbot config={config} /> 
    </div>
  );
}

export default App;