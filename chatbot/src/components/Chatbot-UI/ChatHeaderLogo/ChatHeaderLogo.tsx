import { memo } from 'react';

import { useConfig } from '../../../context/ConfigContext';
import './ChatHeaderLogo.scss';

export const ChatHeaderLogo = memo(() => {
  const config = useConfig();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.src = config.storeImage;
  };

  return (
    <div className="chat-header-left-section">
      <div className="chat-header-logo">
        <img
          src={config.storeImage}
          alt="Store Logo"
          onError={handleImageError}
        />
      </div>
      <h2 className="chat-header-title">Store Assistant</h2>
    </div>
  );
});