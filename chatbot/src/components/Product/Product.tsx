import { useState } from 'react';
import { motion } from 'framer-motion';
import { useConfig } from '../../context/ConfigContext';
import { hexToRgbArray } from '../../utils/utils';
import type { ProductProps, StyleWithCustomProps } from '../../types';
import './Product.scss';

export const Product = ({ product, onAddToCart }: ProductProps) => {
  const config = useConfig();
  const [isAdding, setIsAdding] = useState(false);

  const isOutOfStock = product.variant_quantity === 0;

  const handleAddToCart = async () => {
    if (isAdding || isOutOfStock) return; 

    setIsAdding(true);
    try {
      await onAddToCart(product);
    } catch (err) {
      console.error('Failed to add product to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const dynamicButtonStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };
  if (config.primaryColor) {
    dynamicButtonStyles['--theme-primary-color-rgb'] = primaryColorRgb?.join(', ');
  }

  const cardClasses = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`;
  const linkClasses = `product-view-button ${isOutOfStock ? 'disabled-link' : ''}`;

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <img src={product.image_url} alt={product.name} className="product-image" />
      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>
        {product.price && (
          <div className="product-price">${product.price}</div>
        )}
        <a
          href={isOutOfStock ? undefined : product.url}
          target="_blank"
          className={linkClasses}
          aria-disabled={isOutOfStock}
          onClick={(e) => isOutOfStock && e.preventDefault()}
        >
          View
        </a>
        <button 
          className="product-add-to-cart-button"
          onClick={handleAddToCart}
          style={dynamicButtonStyles}
          disabled={isOutOfStock || isAdding}
        >
          {isOutOfStock ? 'Out of Stock' : (isAdding ? <div className="btn-spinner"></div> : 'Add to Cart')}
        </button>
      </div>
    </motion.div>
  );
};