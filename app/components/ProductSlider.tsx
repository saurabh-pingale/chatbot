import React from "react";
import ProductCard from "./ProductCard";
import { ProductSliderProps } from "app/common/types";
import styles from './styles/Chatbot.module.css';

const ProductSlider: React.FC<ProductSliderProps> = ({ products, color }) => {
  return (
    <div className={styles.productSlider}>
      {products.slice(0, 4).map((product, index) => (
        <ProductCard key={index} product={product} color={color} />
      ))}
    </div>
  );
};

export default ProductSlider;