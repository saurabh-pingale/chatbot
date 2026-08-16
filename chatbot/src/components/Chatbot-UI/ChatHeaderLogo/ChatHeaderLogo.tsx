import { memo } from 'react';

import { useConfig } from '../../../context/ConfigContext';
import { CHATBOT_LOGO_DATA_URI } from '../../../assets/ChatbotLogo';
import { ChatbotLogo } from '../../../assets/ChatbotLogo';
import './ChatHeaderLogo.scss';

export const ChatHeaderLogo = memo(() => {
  const config = useConfig();
  const logoSrc = config.logoUrl || config.storeImage || CHATBOT_LOGO_DATA_URI;
  const useInlineLogo = logoSrc.startsWith('data:image/svg');

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.chat-header-logo-fallback')) {
      const fallback = document.createElement('div');
      fallback.className = 'chat-header-logo-fallback';
      parent.appendChild(fallback);
    }
  };

  return (
    <div className="chat-header-left-section">
      <div className="chat-header-logo">
        {useInlineLogo ? (
          <ChatbotLogo size={28} variant="badge" />
        ) : (
          <img
            src={logoSrc}
            alt={config.headerTitle}
            onError={handleImageError}
          />
        )}
      </div>
      <h2 className="chat-header-title">{config.headerTitle}</h2>
    </div>
  );
});

ChatHeaderLogo.displayName = 'ChatHeaderLogo';
