import { motion } from 'framer-motion';
import type { ProductProps } from '../../types';
import './Product.scss';

export const Product = ({ product }: ProductProps) => {
  const inStock = (product.variant_quantity ?? 0) > 0;
  const cardClasses = `product-card ${!inStock ? 'out-of-stock' : ''}`;
  const linkClasses = `product-view-button ${!inStock ? 'disabled-link' : ''}`;

  const formattedPrice =
    product.price !== undefined && product.price !== null && product.price !== 0 && product.price !== ''
      ? `$${Number(product.price).toFixed(2)}`
      : null;

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={product.image_url || 'https://placehold.co/320x240/f4f6f8/94a3b8?text=No+Image'}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>

        {/* Price */}
        {formattedPrice && (
          <div className="product-price">{formattedPrice}</div>
        )}

        {/* Category + stock badges */}
        <div className="product-badges">
          {product.category && (
            <span className="product-badge product-badge--category">{product.category}</span>
          )}
          <span className={`product-badge ${inStock ? 'product-badge--in-stock' : 'product-badge--out-of-stock'}`}>
            {inStock ? `${product.variant_quantity} in stock` : 'Out of stock'}
          </span>
        </div>

        {/* View link */}
        <a
          href={!inStock ? undefined : product.url}
          target="_blank"
          rel="noreferrer"
          className={linkClasses}
          aria-disabled={!inStock}
          onClick={(e) => !inStock && e.preventDefault()}
        >
          View
        </a>
      </div>
    </motion.div>
  );
};
