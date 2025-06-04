import { useEffect, useState } from 'react';
import { Chatbot } from './components/Chatbot/Chatbot';
import { getStoreColor, getStoreImage } from './services/chat';
import { getShopId } from './utils/utils';

function App() {
  const [config, setConfig] = useState<null | {
    primaryColor: string;
    storeImage: string;
    shopId: string;
  }>(null);

  const fetchConfig = async () => {
    const [color, image] = await Promise.all([
      getStoreColor(),
      getStoreImage(),
    ]);

    const shopId = getShopId();
    
    setConfig({
      primaryColor: color,
      storeImage: image,
      shopId: shopId || 'demo-shop',
    });
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (!config) return null;

  return (
    <div>
      <Chatbot config={config} />
    </div>
  );
}

export default App;