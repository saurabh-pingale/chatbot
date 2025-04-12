export function createCartDrawer() {
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3 class="cart-drawer-title">Added to Cart</h3>
        <button class="cart-drawer-close">×</button>
      </div>
      <div class="cart-drawer-content"></div>
      <button class="checkout-button">Checkout</button>
    `;
    
    drawer.style.display = 'none';
    return drawer;
  }