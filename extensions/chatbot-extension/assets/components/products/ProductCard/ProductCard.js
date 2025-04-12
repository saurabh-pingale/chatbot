import { createLoader } from "../../ui/Loader/Loader";

export function createProductCard(product, primaryColor) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
      <img src="${product.image}" class="product-image">
      <div class="product-title">${product.title}</div>
      <div class="product-price">${product.price}</div>
      <a href="${product.url}" class="view-product-button">View</a>
      <button class="add-to-cart-button">Add to Cart</button>
    `;
    
    const btn = card.querySelector('.add-to-cart-button');
    btn.style.backgroundColor = primaryColor;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      btn.disabled = true;
      const loader = createLoader();
      loader.classList.add('button-loader');
      btn.appendChild(loader);
      btn.innerHTML = '';
      btn.appendChild(loader);

      try {
        await new Promise((resolve) => {
            card.dispatchEvent(new CustomEvent('addToCart', {
                detail: product,
                bubbles: true,
                composed: true
            }));
            
            setTimeout(resolve, 1000);
        });
    } finally {
        btn.removeChild(loader);
        btn.innerHTML = 'Add to Cart';
        btn.disabled = false;
    }
    });
    
    return card;
  }