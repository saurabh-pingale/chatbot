import { createProductCard } from "../ProductCard/ProductCard";

export function createProductSlider(products, primaryColor, onAddToCart) {
  const slider = document.createElement('div');
  slider.className = 'product-slider';
  
  products.slice(0, 4).forEach(product => {
    const card = createProductCard(product, primaryColor);
    card.addEventListener('addToCart', (e) => {
      e.stopPropagation();
      onAddToCart(e.detail)
    });
    slider.appendChild(card);
  });
  
  return slider;
}