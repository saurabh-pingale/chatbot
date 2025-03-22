import { ChatbotToggleButtonProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

export const ChatbotToggleButton = ({ isOpen, onToggle, color }: ChatbotToggleButtonProps) => {
  return (
    <button 
      className={styles.chatbotToggleButton} 
      onClick={() => onToggle()}
      style={{ backgroundColor: color || "#008080" }}
    >
      {isOpen ? '×' : '💬'}
    </button>
  );
};