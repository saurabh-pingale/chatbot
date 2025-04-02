import React from 'react';
import styles from './styles/Chatbot.module.css';
import { SliderOptionProps } from 'app/common/types';

const options = [
  "How do I use the product?",
  "What's the price?",
  "Is there a warranty?",
  "How to return?",
  "Shipping policy"
];

const SliderOption: React.FC<SliderOptionProps> = ({ onClick }) => {
  return (
    <>
      {options.map((option, index) => (
        <button 
          key={index} 
          className={styles.sliderOption}
          onClick={() => onClick(option)}
          style={{ 
            boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2)` 
          }}
        >
          {option}
        </button>
      ))}
    </>
  );
};

export default SliderOption;