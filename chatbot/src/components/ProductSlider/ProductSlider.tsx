import { memo } from 'react';
import { Product } from '../Product/Product';
import type { ProductSliderProps } from '../../types';
import './ProductSlider.scss';

export const ProductSlider = memo<ProductSliderProps>(({ 
  products,
  onAddToCart,
  primaryColor
}) => {
  if (!products.length) return null;

  return (
    <div className="product-slider-container">
      <div className="product-slider-slider">
        {products.slice(0, 4).map((product) => (
            <Product 
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              primaryColor={primaryColor}
            />
        ))}
        {products.length > 4 && (
          <div className="product-slider-see-more-container"> 
            <button 
              className="product-slider-see-more-button"
              onClick={() => window.location.href = '/'}
            >
              See More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}); 