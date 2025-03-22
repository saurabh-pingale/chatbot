import React from "react";
import { ProductCardProps } from "app/common/types";
import styles from './styles/Chatbot.module.css';

const ProductCard: React.FC<ProductCardProps> = ({ product, color }) => {
  return (
    <div className={styles.productCard}>
      <img src={product.image} alt={product.title} className={styles.productImage} />
      <div className={styles.productTitle}>{product.title}</div>
      <div className={styles.productPrice}>{product.price}</div>
      <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.viewProductButton} style={{ backgroundColor: color || "#008080" }}>
        View Product
      </a>
    </div>
  );
};

export default ProductCard;
