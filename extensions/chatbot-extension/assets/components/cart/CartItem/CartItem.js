export function createCartItem(item) {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    
    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.title}" class="cart-item-image">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.title}</h4>
        <p class="cart-item-price">${item.price}</p>
        <div class="cart-item-actions">
          <div class="quantity-selector">
            <button class="quantity-btn minus">-</button>
            <input type="text" class="quantity-input" value="${item.quantity}" readonly>
            <button class="quantity-btn plus">+</button>
          </div>
        </div>
      </div>
    `;

    return cartItem;
  }