let cartItems = [];
let autoCloseTimer = null;
let cartDrawerInitialized = false;

export function updateCartCount() {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElements = document.querySelectorAll('.cart-count');
  
  cartCountElements.forEach(element => {
    element.textContent = totalItems;
    element.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

export function addToCart(product) {
  const existingItem = cartItems.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({
      id: product.id,
      variant_id: product.variant_id || product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }
  
  updateCartDrawer();
  updateShopifyCart();
  updateCartCount();

  const event = new Event('productAddedToCart');
  document.dispatchEvent(event);
}

export function updateShopifyCart() {
  const items = cartItems.map(item => ({
    id: item.variant_id,
    quantity: item.quantity
  }));

  fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ items })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Cart updated:', data);
  })
  .catch(error => {
    console.error('Error updating cart:', error);
  });
}

export function openCartDrawer() {
  let cartDrawer = document.querySelector('.cart-drawer');
  if (!cartDrawer) {
    initCartDrawer();
    cartDrawer = document.querySelector('.cart-drawer');
    if (!cartDrawer) {
      console.error('Failed to initialize cart drawer');
      return;
    }
  }
  
  cartDrawer.classList.add('open');
  cartDrawer.classList.remove('auto-close');
  
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  
  autoCloseTimer = setTimeout(() => {
    cartDrawer.classList.add('auto-close');
  }, 5000);
}

export function closeCartDrawer() {
  const cartDrawer = document.querySelector('.cart-drawer');
  if (cartDrawer) {
    cartDrawer.classList.remove('open');
    cartDrawer.classList.add('auto-close');
  }
}

export function createCartDrawer() {
  const cartDrawer = document.createElement('div');
  cartDrawer.className = 'cart-drawer';
  
  const header = document.createElement('div');
  header.className = 'cart-drawer-header';
  
  const title = document.createElement('h3');
  title.className = 'cart-drawer-title';
  title.textContent = 'Added to Cart';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'cart-drawer-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', closeCartDrawer);
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  const content = document.createElement('div');
  content.className = 'cart-drawer-content';
  
  const checkoutButton = document.createElement('a');
  checkoutButton.className = 'checkout-button';
  checkoutButton.textContent = 'CHECKOUT';
  checkoutButton.href = '/checkout';
  
  cartDrawer.appendChild(header);
  cartDrawer.appendChild(content);
  cartDrawer.appendChild(checkoutButton);

  updateCartDrawer();
  return cartDrawer;
}

export function initCartDrawer() {
  if (cartDrawerInitialized) return;
  
  const chatbotWindow = document.querySelector('.chatbot-window');
  const existingDrawer = document.querySelector('.cart-drawer');
  
  if (chatbotWindow && !existingDrawer) {
    const cartDrawer = createCartDrawer();
    chatbotWindow.appendChild(cartDrawer);
    cartDrawerInitialized = true;
    updateCartCount();
  }
}

export function updateCartDrawer() {
  const content = document.querySelector('.cart-drawer-content');
  if (!content) return;
  
  content.innerHTML = '';
  
  if (cartItems.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Your cart is empty';
    content.appendChild(emptyMessage);
    return;
  }
  
  cartItems.forEach(item => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    
    const image = document.createElement('img');
    image.className = 'cart-item-image';
    image.src = item.image;
    image.alt = item.title;
    
    const details = document.createElement('div');
    details.className = 'cart-item-details';
    
    const title = document.createElement('h4');
    title.className = 'cart-item-title';
    title.textContent = item.title;
    
    const price = document.createElement('p');
    price.className = 'cart-item-price';
    price.textContent = item.price;
    
    const actions = document.createElement('div');
    actions.className = 'cart-item-actions';
    
    const quantitySelector = document.createElement('div');
    quantitySelector.className = 'quantity-selector';
    
    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'quantity-btn';
    decreaseBtn.textContent = '-';
    decreaseBtn.addEventListener('click', () => updateQuantity(item, -1));
    
    const quantityInput = document.createElement('input');
    quantityInput.className = 'quantity-input';
    quantityInput.type = 'text';
    quantityInput.value = item.quantity;
    quantityInput.readOnly = true;
    
    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'quantity-btn';
    increaseBtn.textContent = '+';
    increaseBtn.addEventListener('click', () => updateQuantity(item, 1));
    
    quantitySelector.appendChild(decreaseBtn);
    quantitySelector.appendChild(quantityInput);
    quantitySelector.appendChild(increaseBtn);
    
    actions.appendChild(quantitySelector);
    
    details.appendChild(title);
    details.appendChild(price);
    details.appendChild(actions);
    
    cartItem.appendChild(image);
    cartItem.appendChild(details);
    
    content.appendChild(cartItem);
  });
}

export function updateQuantity(item, change) {
  item.quantity += change;
  
  if (item.quantity < 1) {
    cartItems = cartItems.filter(cartItem => cartItem.id !== item.id);
  }
  
  updateCartDrawer();
  updateShopifyCart();
  updateCartCount();
  
  const cartDrawer = document.querySelector('.cart-drawer');
  if (cartDrawer) {
    cartDrawer.classList.remove('auto-close');
    
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    
    autoCloseTimer = setTimeout(() => {
      cartDrawer.classList.add('auto-close');
    }, 5000);
  }
}

export function getCartItems() {
  return cartItems;
}