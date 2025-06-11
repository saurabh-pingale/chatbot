import { useEffect, useState } from 'react';
import { Chatbot } from './pages/Chatbot/Chatbot';
import { getShopConfig } from './utils/utils';
import { trackOpenedChatbot } from './services/analytics';
import { captureUtmParameters, getStoredUtmParameters } from './utils/utm';
import type { ChatbotAppConfig } from './types';
import './App.scss';

function App() {
  const [config, setConfig] = useState<null | ChatbotAppConfig>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    captureUtmParameters();

    const fetchConfig = async () => {
      try {
        const config = await getShopConfig();
        setConfig(config);

        if (config.setupCompleted) {
          const userId = localStorage.getItem('user_id') || 'anonymous_user'; 
          const utmParams = getStoredUtmParameters();
          trackOpenedChatbot(userId, config.shopId, utmParams);
        }
      } catch (error) {
        console.error("Failed to fetch configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (isLoading) {
    return null;
  }

  if (!config) {
    return (
      <div className="popup-styles">
        <div className="card-styles">
            <h2 className="title-styles">Chatbot Error</h2>
            <p>Could not load chatbot configuration.</p>
        </div>
      </div>
    );
  }

  if (!config.setupCompleted) {
    return (
      <div className="popup-styles">
        <div className="card-styles">
            <h2 className="title-styles">Chatbot Status</h2>
            <p>
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