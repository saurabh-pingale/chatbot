import { motion } from 'framer-motion';
import type { ProductProps } from '../../types';
import './Product.scss';

// Convert currency code to symbol
const getCurrencySymbol = (currencyCode: string): string => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/\d/g, '')
      .trim();
  } catch {
    return currencyCode;
  }
};

export const Product = ({ product }: ProductProps) => {
  const inStock = (product.variant_quantity ?? 0) > 0;
  const cardClasses = `product-card ${!inStock ? 'out-of-stock' : ''}`;
  const linkClasses = `product-view-button ${!inStock ? 'disabled-link' : ''}`;

  const formattedPrice =
    product.price !== undefined && product.price !== null && product.price !== 0 && product.price !== ''
      ? `${getCurrencySymbol(product.currency_code)}${Number(product.price).toFixed(2)}`
      : null;

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={product.image_url || 'https://placehold.co/320x240/e5e7eb/6b7280?text=No+Image'}
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
