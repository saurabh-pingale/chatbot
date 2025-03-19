import React, { useState } from 'react';
import styles from './Chatbot.module.css'

interface InputComponentProps {
  onSendMessage: (message: string) => void;
  color: string | null;
}

const InputComponent: React.FC<InputComponentProps> = ({ onSendMessage, color }) => {
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className={styles.chatbotInput}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        placeholder="Type your message..."
      />
      <button 
        onClick={handleSendMessage} 
        className={styles.chatbotInputButton}
        style={{ backgroundColor: color || "#008080" }}>
        Send</button>
    </div>
  );
};

export default InputComponent;
