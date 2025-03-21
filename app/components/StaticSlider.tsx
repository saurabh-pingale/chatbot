import React, { useRef, useState, useEffect } from 'react';
import styles from './Chatbot.module.css';

interface StaticSliderProps {
  color: string | null;
}

const StaticSlider: React.FC<StaticSliderProps> = ({ color }) => {
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
    console.log(`Selected option: ${option}`);
    // You can add functionality to send this as a message
  };

  return (
    <div className={styles.staticSliderContainer}>
      {showLeftButton && (
        <button 
          className={styles.sliderButton} 
          onClick={() => scroll('left')}
          style={{ left: 0, backgroundColor: color || '#008080' }}
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
            style={{ borderColor: color || '#008080' }}
          >
            {option}
          </button>
        ))}
      </div>
      
      {showRightButton && (
        <button 
          className={styles.sliderButton} 
          onClick={() => scroll('right')}
          style={{ right: 0, backgroundColor: color || '#008080' }}
        >
          &gt;
        </button>
      )}
    </div>
  );
};

export default StaticSlider;