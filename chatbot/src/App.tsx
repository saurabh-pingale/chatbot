import { useEffect, useState } from 'react';
import { Chatbot } from './components/Chatbot/Chatbot';
import { COLORS } from './constants/colors';
import { IMAGE } from './constants/colors';
// import { getStoreColor, getStoreImage } from './services/chat';
import { getShopId } from './services/shopify';

function App() {
  const [config, setConfig] = useState<null | {
    primaryColor: string;
    storeImage: string;
    shopId: string;
  }>(null);

  const fetchConfig = async () => {
    // const [storeImage] = await Promise.all([
    //   getStoreColor(),
    //   getStoreImage(),
    // ]);
    const shopId = getShopId();
    setConfig({
      primaryColor: COLORS.ORANGE_450 || '#FF8C00',
      storeImage: IMAGE.FALLBACK,
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