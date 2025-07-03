import { useEffect, useState } from 'react';
import { Chatbot } from './pages/Chatbot/Chatbot';
import { trackOpenedChatbot } from './services/analytics';
import { CartProvider } from './context/CartContext';
import { getQuickReplies } from './services/quick_replies';
import { getShopConfig } from './utils/utils';
import { captureUtmParameters, getStoredUtmParameters } from './utils/utm';
import type { ChatbotAppConfig } from './types';
import './App.scss';

function App() {
  const [config, setConfig] = useState<null | ChatbotAppConfig>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    captureUtmParameters();

    const fetchConfigAndQuickReplies = async () => {
      try {
        const config = await getShopConfig();
        setConfig(config);

        if (config.setupCompleted) {
          const userId = localStorage.getItem('user_id');
          const utmParams = getStoredUtmParameters();
          trackOpenedChatbot(userId, config.shopId, utmParams);
        }

        if (config?.shopId) {
          const replies = await getQuickReplies(config.shopId);
          setQuickReplies(replies);
        }
      } catch (error) {
        console.error("Failed to fetch configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigAndQuickReplies();
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
      <CartProvider>
        <Chatbot config={config} quickReplies={quickReplies} />
      </CartProvider>
    </div>
  );
}

export default App;