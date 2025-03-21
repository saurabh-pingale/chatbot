import React, { useRef, useState, useEffect } from 'react';
import styles from './Chatbot.module.css';

interface StaticSliderProps {
  color: string | null;
  onSelectOption: (option: string) => void;
}

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

  useEffect(() => {
    const checkScroll = () => {
      if (!sliderRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setShowLeftButton(scrollLeft > 5);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    };

    const sliderElement = sliderRef.current;
    if (sliderElement) {
      sliderElement.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
      
      return () => {
        sliderElement.removeEventListener('scroll', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    
    const scrollAmount = 200;
    const currentScroll = sliderRef.current.scrollLeft;
    
    sliderRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleOptionClick = (option: string) => {
    onSelectOption(option);
  };

  const defaultColor = '#008B8B'; // Teal color similar to the image
  const buttonColor = color || defaultColor;

  return (
    <div className={styles.staticSliderWrapper}>
      <div className={styles.staticSliderContainer}>
        {showLeftButton && (
          <button 
            className={styles.sliderButton} 
            onClick={() => scroll('left')}
            style={{ backgroundColor: buttonColor }}
          >
            &lt;
          </button>
        )}
        
        <div className={styles.staticSlider} ref={sliderRef}>
          {options.map((option, index) => (
            <button 
              key={index} 
              className={styles.sliderOption}
              onClick={() => handleOptionClick(option)}
              style={{ borderColor: buttonColor, color: '#333' }}
            >
              {option}
            </button>
          ))}
        </div>
        
        {showRightButton && (
          <button 
            className={styles.sliderButton} 
            onClick={() => scroll('right')}
            style={{ backgroundColor: buttonColor }}
          >
            &gt;
          </button>
        )}
      </div>
    </div>
  );
};

export default StaticSlider;