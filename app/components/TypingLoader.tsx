import React from 'react';
import styles from './styles/Chatbot.module.css';
import { TypingLoaderProps } from 'app/common/types';

const TypingLoader: React.FC<TypingLoaderProps> = ({ color }) => {
  const defaultColor = "#008080";
  const themeColor = color || defaultColor;

  return (
    <div className={`${styles.message} ${styles.bot} ${styles.typingLoader}`}
    style={{ backgroundColor: '#f0f0f0', borderColor: '#e0e0e0' }}>
      <div className={styles.dot} style={{ backgroundColor: themeColor }}></div>
      <div className={styles.dot} style={{ backgroundColor: themeColor }}></div>
      <div className={styles.dot} style={{ backgroundColor: themeColor }}></div>
    </div>
  );
};

export default TypingLoader;