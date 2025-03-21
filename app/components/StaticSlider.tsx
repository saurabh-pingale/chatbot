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
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    };

    const sliderElement = sliderRef.current;
    if (sliderElement) {
      sliderElement.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
      
      // Check on window resize as well
      window.addEventListener('resize', checkScroll);
      
      return () => {
        sliderElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
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

  // Custom button style based on the theme color
  const getButtonHighlightStyle = (baseColor: string) => {
    // Create a slightly lighter version of the base color for hover effects
    const colorWithoutHash = baseColor.replace('#', '');
    const r = parseInt(colorWithoutHash.substr(0, 2), 16);
    const g = parseInt(colorWithoutHash.substr(2, 2), 16);
    const b = parseInt(colorWithoutHash.substr(4, 2), 16);
    
    // Lighten by 15%
    const lighterColor = `#${Math.min(255, Math.floor(r * 1.15)).toString(16).padStart(2, '0')}${
      Math.min(255, Math.floor(g * 1.15)).toString(16).padStart(2, '0')}${
      Math.min(255, Math.floor(b * 1.15)).toString(16).padStart(2, '0')}`;
    
    return {
      backgroundColor: baseColor,
      borderColor: lighterColor
    };
  };

  const themeColor = color || '#008080';
  const buttonStyle = getButtonHighlightStyle(themeColor);

  return (
    <div className={styles.staticSliderContainer}>
      {showLeftButton && (
        <button 
          className={styles.sliderButton} 
          onClick={() => scroll('left')}
          style={{ left: 0, backgroundColor: themeColor }}
          aria-label="Scroll left"
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
            style={{ 
              boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px ${themeColor}25` 
            }}
          >
            {option}
          </button>
        ))}
      </div>
      
      {showRightButton && (
        <button 
          className={styles.sliderButton} 
          onClick={() => scroll('right')}
          style={{ right: 0, backgroundColor: themeColor }}
          aria-label="Scroll right"
        >
          &gt;
        </button>
      )}
    </div>
  );
};

export default StaticSlider;