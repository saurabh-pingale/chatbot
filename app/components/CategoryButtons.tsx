import React from 'react';
import { CategoryButtonsProps } from '../common/types/index';
import styles from './styles/Chatbot.module.css';


const CategoryButtons: React.FC<CategoryButtonsProps> = ({ 
  categories, 
  color = "#008080",
  onSelectCategory 
}) => {
  return (
    <div className={styles.categoryButtonsContainer}>
      {categories.map((category, index) => (
        <button
          key={index}
          className={styles.categoryButton}
          style={{ 
            backgroundColor: color,
            borderColor: color
          }}
          onClick={() => onSelectCategory(`Show ${category}`)}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryButtons;