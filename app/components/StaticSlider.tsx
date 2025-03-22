import React, { useRef, useState, useEffect } from 'react';
import { StaticSliderProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

const StaticSlider: React.FC<StaticSliderProps> = ({ color, onSelectOption }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  const options = [
    "How do I use the product?",
    "What's the price?",
    "Is there a warranty?",
    "How to return?",
    "Shipping policy"
  ];

  const checkScroll = () => {
    if (!sliderRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setShowLeftButton(scrollLeft > 10);
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const sliderElement = sliderRef.current;
    
    if (sliderElement) {
      sliderElement.addEventListener('scroll', checkScroll);
  
      checkScroll();
      
      window.addEventListener('resize', checkScroll);
      
      return () => {
        sliderElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    
    const scrollAmount = 150;
    const currentScroll = sliderRef.current.scrollLeft;
    
    sliderRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleOptionClick = (option: string) => {
    onSelectOption(option);
  };

  const themeColor = color || '#008080';

  return (
    <div className={styles.staticSliderContainer}>
      <div className={styles.staticSlider} ref={sliderRef}>
        {options.map((option, index) => (
          <button 
            key={index} 
            className={styles.sliderOption}
            onClick={() => handleOptionClick(option)}
            style={{ 
              boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2)` 
            }}
          >
            {option}
          </button>
        ))}
      </div>
      
      {showLeftButton && (
        <button 
          className={`${styles.sliderButton} ${styles.sliderLeftButton}`}
          onClick={() => scroll('left')}
          style={{ backgroundColor: themeColor }}
          aria-label="Scroll left"
        >
          &lt;
        </button>
      )}
      
      {showRightButton && (
        <button 
          className={`${styles.sliderButton} ${styles.sliderRightButton}`}
          onClick={() => scroll('right')}
          style={{ backgroundColor: themeColor }}
          aria-label="Scroll right"
        >
          &gt;
        </button>
      )}
    </div>
  );
};

export default StaticSlider;