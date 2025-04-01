import React, { useRef, useState, useEffect } from 'react';
import LeftSliderButton from './LeftSliderButton';
import RightSliderButton from './RightSliderButton';
import { StaticSliderProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';
import SliderOption from './SliderOption';

const StaticSlider: React.FC<StaticSliderProps> = ({ color, onSelectOption }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

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

  const themeColor = color || '#008080';

  return (
    <div className={styles.staticSliderContainer}>
      <div className={styles.staticSlider} ref={sliderRef}>
        <SliderOption onClick={onSelectOption} />
      </div>
      
      {showLeftButton && (
        <LeftSliderButton 
        onClick={() => scroll('left')} 
        color={themeColor} 
      />
      )}
      
      {showRightButton && (
        <RightSliderButton 
        onClick={() => scroll('right')} 
        color={themeColor} 
      />
      )}
    </div>
  );
};

export default StaticSlider;