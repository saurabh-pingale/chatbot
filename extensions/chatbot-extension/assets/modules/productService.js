import { addToCart, openCartDrawer } from './cartService.js';

export function createProductSlider(products, primaryColor) {
  const slider = document.createElement('div');
  slider.className = 'product-slider';

  products.slice(0, 4).forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';

    const productImage = document.createElement('img');
    productImage.src = product.image;
    productImage.alt = product.title;
    productImage.className = 'product-image';

    const titleElement = document.createElement('div');
    titleElement.className = 'product-title';
    titleElement.textContent = product.title;

    const priceElement = document.createElement('div');
    priceElement.className = 'product-price';
    priceElement.textContent = product.price;

    const viewButton = document.createElement('a');
    viewButton.href = product.url;
    viewButton.target = '_blank';
    viewButton.rel = 'noopener noreferrer';
    viewButton.className = 'view-product-button';
    viewButton.textContent = 'View Product';
    viewButton.style.backgroundColor = primaryColor;

    const addToCartButton = document.createElement('button');
    addToCartButton.className = 'add-to-cart-button';
    addToCartButton.textContent = 'ADD TO CART';
    addToCartButton.style.backgroundColor = primaryColor || '#000';
    addToCartButton.dataset.productId = product.id;
    addToCartButton.dataset.productVariantId = product.variant_id || product.id;
    addToCartButton.dataset.productTitle = product.title;
    addToCartButton.dataset.productPrice = product.price;
    addToCartButton.dataset.productImage = product.image;

    addToCartButton.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart(product);
      openCartDrawer();
      
      addToCartButton.textContent = 'ADDED TO CART';
      addToCartButton.classList.add('added');
      
      setTimeout(() => {
        addToCartButton.textContent = 'ADD TO CART';
        addToCartButton.classList.remove('added');
      }, 3000);
    });

    productCard.appendChild(productImage);
    productCard.appendChild(titleElement);
    productCard.appendChild(priceElement);
    productCard.appendChild(viewButton);
    productCard.appendChild(addToCartButton);

    slider.appendChild(productCard);
  });

  return slider;
}