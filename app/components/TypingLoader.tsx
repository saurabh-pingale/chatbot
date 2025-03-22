import React from 'react';
import { TypingLoaderProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

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