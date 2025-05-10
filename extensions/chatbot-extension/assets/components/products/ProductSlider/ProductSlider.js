import { createProductCard } from "../ProductCard/ProductCard";

export function createProductSlider(products, primaryColor, onAddToCart) {
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'product-slider-container';

  const slider = document.createElement('div');
  slider.className = 'product-slider';
  
  products.slice(0, 4).forEach(product => {
    const card = createProductCard(product, primaryColor);
    card.addEventListener('addToCart', (e) => {
      e.stopPropagation();
      onAddToCart(e.detail);
    });
    slider.appendChild(card);
  });

  if (products.length > 0) {
    const seeMoreContainer = document.createElement('div');
    seeMoreContainer.className = 'see-more-container';
    
    const seeMoreButton = document.createElement('button');
    seeMoreButton.className = 'see-more-button';
    seeMoreButton.textContent = 'See More';
    seeMoreButton.style.backgroundColor = primaryColor;
    
    seeMoreButton.addEventListener('click', () => {
      window.location.href = '/'; 
    });

    seeMoreContainer.appendChild(seeMoreButton);
    slider.appendChild(seeMoreContainer);
  }
  
  return slider;
}