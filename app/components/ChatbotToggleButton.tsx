import styles from './Chatbot.module.css';

interface ChatbotToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  color: string | null;
}

export const ChatbotToggleButton = ({ isOpen, onToggle, color }: ChatbotToggleButtonProps) => {
  const handleClick = () => { 
    onToggle(); 
  };

  return (
    <button 
      className={styles.chatbotToggleButton} 
      onClick={handleClick}
      style={{ backgroundColor: color || "#008080" }}
    >
      {isOpen ? '×' : '💬'}
    </button>
  );
};