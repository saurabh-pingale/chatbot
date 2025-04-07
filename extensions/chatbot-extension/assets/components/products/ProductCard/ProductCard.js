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

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      card.dispatchEvent(new CustomEvent('addToCart', {
          detail: product,
          bubbles: true
      }));
    });
    
    return card;
  }