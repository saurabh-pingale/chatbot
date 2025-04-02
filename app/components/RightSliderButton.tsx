import React from 'react';
import { RightSliderButtonProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

const RightSliderButton: React.FC<RightSliderButtonProps> = ({ onClick, color }) => {
  return (
    <button 
      className={`${styles.sliderButton} ${styles.sliderRightButton}`}
      onClick={onClick}
      style={{ backgroundColor: color }}
      aria-label="Scroll right"
    >
      &gt;
    </button>
  );
};

export default RightSliderButton;