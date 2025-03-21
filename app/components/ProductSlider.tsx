import React from "react";
import styles from './Chatbot.module.css';

interface Product {
  title: string;
  price: string;
  image: string;
  url: string;
}

interface ProductSliderProps {
  products: Product[];
  color: string | null;
}

const ProductSlider: React.FC<ProductSliderProps> = ({ products, color }) => {
  return (
    <div className={styles.productSlider}>
      {products.slice(0, 4).map((product, index) => (
        <div key={index} className={styles.productCard}>
          <img src={product.image} alt={product.title} className={styles.productImage} />
          <div className={styles.productTitle}>{product.title}</div>
          <div className={styles.productPrice}>{product.price}</div>
          <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.viewProductButton} style={{ backgroundColor: color || "#008080" }}>
            View Product
          </a>
        </div>
      ))}
    </div>
  );
};

export default ProductSlider;