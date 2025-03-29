import React from 'react';
import styles from './styles/Chatbot.module.css';

interface CategoryButtonsProps {
  categories: string[];
  color?: string;
  onSelectCategory: (category: string) => void;
}

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