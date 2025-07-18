import { memo } from 'react';

import { useConfig } from '../../../context/ConfigContext';
import { hexToRgbArray } from '../../../utils/utils';
import { ChatHeaderLogo } from '../ChatHeaderLogo/ChatHeaderLogo';
import { ChatHeaderActions } from '../ChatHeaderActions/ChatHeaderActions';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../../types';
import './ChatHeader.scss';

export const ChatHeader = memo<ChatHeaderProps>(({
  onClearConversation,
  onMinimize,
  setError,
  isEmailGateVisible,
  messagesCount
}) => {
  const config = useConfig();

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };
  
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-values'] = primaryColorRgb.join(' ');
  }

  return (
    <div className="chat-header-container" style={headerStyles}>
      <ChatHeaderLogo />

      <ChatHeaderActions
        onClearConversation={onClearConversation}
        onMinimize={onMinimize}
        setError={setError}
        isEmailGateVisible={isEmailGateVisible}
        messagesCount={messagesCount}
        headerStyles={headerStyles}
      />
    </div>
  );
});