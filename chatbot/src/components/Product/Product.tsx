import { motion } from 'framer-motion';
import type { ProductProps, StyleWithCustomProps } from '../../types';
import './Product.scss';

export const Product = ({ product, onAddToCart, primaryColor }: ProductProps) => {
  const handleAddToCart = async () => {
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
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <img src={product.image_url} alt={product.name} className="product-image" />
      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>
        <div className="product-price">{product.price}</div>
        <a href={`/products/${product.id}`} target="_blank" className="product-view-button">
          View
        </a>
        <button 
          className="product-add-to-cart-button"
          onClick={handleAddToCart}
          style={dynamicButtonStyles}
        >
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
};