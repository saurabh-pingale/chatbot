import { addToCart } from './cart.service';

export function createProductCard(product, primaryColor) {
  const card = document.createElement('div');
  card.className = 'product-card';
  
  card.innerHTML = `
    <img src="${product.image}" alt="${product.title}" class="product-image">
    <div class="product-title">${product.title}</div>
    <div class="product-price">${product.price}</div>
    <a href="${product.url}" class="view-product-button">View Product</a>
    <button class="add-to-cart-button">ADD TO CART</button>
  `;
  
  const addToCartBtn = card.querySelector('.add-to-cart-button');
  addToCartBtn.style.backgroundColor = primaryColor;
  
  addToCartBtn.addEventListener('click', () => {
    addToCart(product);
    addToCartBtn.textContent = 'ADDED!';
    setTimeout(() => {
      addToCartBtn.textContent = 'ADD TO CART';
    }, 2000);
  });
  
  return card;
}