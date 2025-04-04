import { createProductCard } from '../ProductCard/ProductCard';

export function createProductSlider(products, primaryColor) {
  const slider = document.createElement('div');
  slider.className = 'product-slider';
  
  products.slice(0, 4).forEach(product => {
    const card = createProductCard(product, primaryColor);
    slider.appendChild(card);
  });
  
  return slider;
}