import { memo } from 'react';
import { motion } from 'framer-motion';

import { CONFIGMESSAGE } from '../../../constants/messages';
import { TrashIconSVG } from '../../../assets/TrashIcon';
import { ChevronDownIconSVG } from '../../../assets/ChevronDownIcon';
// import { RingBellIconSVG } from '../../../assets/RingBellIcon';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../../types';
import './ChatHeaderActions.scss';

interface ChatHeaderActionsProps extends Pick<ChatHeaderProps, 'onClearConversation' | 'onMinimize' | 'setError' | 'isEmailGateVisible' | 'messagesCount'> {
  headerStyles: StyleWithCustomProps;
}

export const ChatHeaderActions = memo<ChatHeaderActionsProps>(({
  onClearConversation,
  onMinimize,
  isEmailGateVisible,
  messagesCount,
}) => {
  const showClearConversationIcon = (messagesCount >= CONFIGMESSAGE.MIN_MESSAGES_TO_SHOW_CLEAR_ICON) && !isEmailGateVisible;

  return (
    <>
      <div className="chat-header-right-section">
        {/* Notification / offers icon — disabled for FAQ assistant MVP
        {!isEmailGateVisible && (
          <motion.div
            className="chat-header-icon-wrapper chat-header-offers-icon-wrapper"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="View Offers"
          >
            <RingBellIconSVG />
          </motion.div>
        )}
        */}

        {showClearConversationIcon && onClearConversation && (
          <motion.div
            className="chat-header-icon-wrapper chat-header-trash-icon-wrapper"
            onClick={onClearConversation}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Clear conversation"
          >
            <TrashIconSVG />
          </motion.div>
        )}
        <motion.div
          className="chat-header-icon-wrapper chat-header-minimize-icon-wrapper mobile-only"
          onClick={onMinimize}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Minimize"
        >
          <ChevronDownIconSVG />
        </motion.div>
      </div>
    </>
  );
});

ChatHeaderActions.displayName = 'ChatHeaderActions';
