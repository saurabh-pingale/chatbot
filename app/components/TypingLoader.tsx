import React from 'react';
import styles from './Chatbot.module.css';

interface TypingLoaderProps {
  color: string | null;
}

const TypingLoader: React.FC<TypingLoaderProps> = ({ color }) => {
  return (
    <div className={`${styles.message} ${styles.bot} ${styles.typingLoader}`}
    style={{ backgroundColor: color || '#40444b', borderColor: color || '#40444b' }}>
      <div className={styles.dot} style={{ backgroundColor: color || "#008080" }}></div>
      <div className={styles.dot} style={{ backgroundColor: color || "#008080" }}></div>
      <div className={styles.dot} style={{ backgroundColor: color || "#008080" }}></div>
    </div>
  );
};

export default TypingLoader;