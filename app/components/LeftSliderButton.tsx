import React from 'react';
import { LeftSliderButtonProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

const LeftSliderButton: React.FC<LeftSliderButtonProps> = ({ onClick, color }) => {
  return (
    <button 
      className={`${styles.sliderButton} ${styles.sliderLeftButton}`}
      onClick={onClick}
      style={{ backgroundColor: color }}
      aria-label="Scroll left"
    >
      &lt;
    </button>
  );
};

export default LeftSliderButton;