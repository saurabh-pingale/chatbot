import { memo } from 'react';
import { Product } from '../Product/Product';
import type { ProductSliderProps, ProductType } from '../../types';
import './ProductSlider.scss';

const defaultOnAddToCart = async (product: ProductType): Promise<void> => {
  console.warn('ProductSlider: onAddToCart prop was not provided.', product);
};

export const ProductSlider = memo<ProductSliderProps>(({ 
  products,
  onAddToCart
}) => {
  if (!products.length) return null;

  const handleAddToCart = onAddToCart || defaultOnAddToCart;

  return (
    <div className="product-slider-container">
      <div className="product-slider-slider">
        {products.map((product) => (
            <Product 
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
        ))}
      </div>
    </div>
  );
}); 