export function createCartDrawer() {
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3 class="cart-drawer-title">Added to Cart</h3>
        <button class="cart-drawer-close">×</button>
      </div>
      <div class="cart-drawer-content"></div>
      <a href="/checkout" class="checkout-button">Checkout</a>
    `;
    
    return drawer;
  }