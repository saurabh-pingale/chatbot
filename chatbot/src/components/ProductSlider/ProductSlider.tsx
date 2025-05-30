import { memo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '../../types';
import './ProductSlider.scss';

interface ProductSliderProps {
  products: Product[];
  onAddToCart: (product: Product) => Promise<void>;
  primaryColor?: string;
}

interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

export const ProductSlider = memo<ProductSliderProps>(({ 
  products,
  onAddToCart,
  primaryColor
}) => {
  if (!products.length) return null;

  const handleAddToCart = async (product: Product) => {
    try {
      await onAddToCart(product);
    } catch (err) {
      console.error('Failed to add product to cart:', err);
    }
  };

  const dynamicButtonStyles: StyleWithCustomProps = {};
  if (primaryColor) {
    dynamicButtonStyles['--theme-primary-color'] = primaryColor;
  }

  return (
    <div className="product-slider-container">
      <div className="product-slider-slider">
        {products.slice(0, 4).map((product) => (
          <motion.div
            className="product-slider-card"
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <img src={product.image} alt={product.title} className="product-slider-image" />
            <div className="product-slider-info">
              <h4 className="product-slider-title">{product.title}</h4>
              <div className="product-slider-price">{product.price}</div> 
              <a href={`/products/${product.id}`} target="_blank" className="product-slider-view-button">
                View
              </a>
              <button 
                className="product-slider-add-to-cart-button"
                onClick={() => handleAddToCart(product)}
              >
                Add to Cart
              </button>
            </div>
          </motion.div>
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