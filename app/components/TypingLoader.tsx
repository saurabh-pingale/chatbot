import React from 'react';
import styles from './styles/Chatbot.module.css';

const TypingLoader: React.FC = () => {
  return (
    <div className={`${styles.message} ${styles.bot} ${styles.typingLoader}`}
    style={{ backgroundColor: '#40444b', borderColor: '#40444b' }}>
      <div className={styles.dot} style={{ backgroundColor: "#008080" }}></div>
      <div className={styles.dot} style={{ backgroundColor: "#008080" }}></div>
      <div className={styles.dot} style={{ backgroundColor: "#008080" }}></div>
    </div>
  );
};

export default TypingLoader;