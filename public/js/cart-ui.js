/**
 * Shopping Cart UI Component
 * Creates and manages a cart drawer/modal for quick access to cart
 */

class CartUI {
  constructor() {
    this.isOpen = false;
    this.drawer = null;
    this.cartToggle = null;
    this.cartBadge = null;
    this.init();
  }

  init() {
    // Look for existing cart toggle button or create one
    this.cartToggle = document.querySelector('.cart-toggle');
    if (!this.cartToggle) {
      console.warn('No cart toggle button found. Add <button class="cart-toggle">🛒</button> to your header.');
      return;
    }

    this.cartBadge = this.cartToggle.querySelector('.cart-badge');
    if (!this.cartBadge) {
      this.cartBadge = document.createElement('span');
      this.cartBadge.className = 'cart-badge';
      this.cartToggle.appendChild(this.cartBadge);
    }

    this.createDrawer();
    this.attachEventListeners();
    this.updateBadge();

    // Subscribe to cart changes
    if (window.cart) {
      window.cart.subscribe(() => this.updateBadge());
    }
  }

  /**
   * Create cart drawer HTML
   */
  createDrawer() {
    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-backdrop"></div>
      <div class="cart-panel">
        <div class="cart-header">
          <h2>Shopping Cart <span class="cart-count">0</span></h2>
          <button class="cart-close" aria-label="Close cart">×</button>
        </div>
        <div class="cart-items-list">
          <div class="loading">Loading...</div>
        </div>
        <div class="cart-footer">
          <div class="cart-total">
            <div class="total-line">
              <span>Subtotal:</span>
              <span class="total-price">$0.00</span>
            </div>
          </div>
          <a href="/cart" class="btn btn-primary">View Cart</a>
          <a href="/checkout" class="btn btn-secondary">Checkout</a>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);
    this.drawer = drawer;

    // Event listeners
    this.drawer.querySelector('.cart-close').addEventListener('click', () => this.close());
    this.drawer.querySelector('.cart-backdrop').addEventListener('click', () => this.close());

    // Update drawer when cart changes
    if (window.cart) {
      window.cart.subscribe(() => this.updateDrawer());
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (this.cartToggle) {
      this.cartToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Toggle drawer open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open drawer
   */
  open() {
    if (!this.drawer) return;
    this.isOpen = true;
    this.drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.updateDrawer();
  }

  /**
   * Close drawer
   */
  close() {
    if (!this.drawer) return;
    this.isOpen = false;
    this.drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  /**
   * Update badge count
   */
  updateBadge() {
    if (!this.cartBadge || !window.cart) return;

    const count = window.cart.getItemCount();
    if (count > 0) {
      this.cartBadge.textContent = count;
      this.cartBadge.style.display = 'block';
    } else {
      this.cartBadge.style.display = 'none';
    }

    if (this.drawer) {
      this.drawer.querySelector('.cart-count').textContent = count;
    }
  }

  /**
   * Update drawer contents
   */
  updateDrawer() {
    if (!this.drawer || !window.cart) return;

    const cart = window.cart.getCart();
    const items = cart.items || [];
    const totals = cart.totals || {};

    const itemsList = this.drawer.querySelector('.cart-items-list');

    if (items.length === 0) {
      itemsList.innerHTML = '<div class="empty-message">Your cart is empty</div>';
    } else {
      itemsList.innerHTML = items.map((item, index) => `
        <div class="drawer-item">
          <div class="item-info">
            <div class="item-quantity">${item.quantity}x</div>
            <div>
              <div class="item-title">Product #${item.productId}</div>
              <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          </div>
          <button
            class="item-remove"
            onclick="window.cartUI.removeItem(${index})"
            title="Remove item"
          >
            ×
          </button>
        </div>
      `).join('');
    }

    // Update total
    const totalPrice = this.drawer.querySelector('.total-price');
    if (totalPrice) {
      totalPrice.textContent = '$' + parseFloat(totals.total || totals.subtotal || 0).toFixed(2);
    }
  }

  /**
   * Remove item from drawer
   */
  async removeItem(index) {
    if (!window.cart) return;

    try {
      await window.cart.removeItem(index);
    } catch (err) {
      console.error('Failed to remove item:', err);
      alert('Failed to remove item');
    }
  }
}

// Create global instance
window.cartUI = new CartUI();

// Inject styles
const style = document.createElement('style');
style.textContent = `
  .cart-toggle {
    position: relative;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    transition: transform 0.2s;
  }

  .cart-toggle:hover {
    transform: scale(1.1);
  }

  .cart-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    display: none;
  }

  .cart-drawer {
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    z-index: 999;
    display: flex;
    flex-direction: column;
    transition: right 0.3s ease;
  }

  .cart-drawer.open {
    right: 0;
  }

  @media (max-width: 500px) {
    .cart-drawer {
      width: 100%;
      right: -100%;
    }
  }

  .cart-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 998;
  }

  .cart-drawer.open .cart-backdrop {
    opacity: 1;
    pointer-events: auto;
  }

  .cart-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cart-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .cart-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cart-close:hover {
    color: #333;
  }

  .cart-items-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .empty-message {
    text-align: center;
    padding: 2rem 1rem;
    color: #666;
  }

  .drawer-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .item-info {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex: 1;
  }

  .item-quantity {
    font-weight: 600;
    color: #666;
    min-width: 40px;
  }

  .item-title {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .item-price {
    color: #111;
    font-weight: 600;
  }

  .item-remove {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-remove:hover {
    color: #ef4444;
  }

  .cart-footer {
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .cart-total {
    margin-bottom: 1rem;
  }

  .total-line {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 1.125rem;
  }

  .total-price {
    color: #111;
  }

  .cart-footer .btn {
    display: block;
    width: 100%;
    padding: 0.75rem;
    text-align: center;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 500;
    margin-top: 0.75rem;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: white;
    color: #3b82f6;
    border: 1px solid #3b82f6;
  }

  .btn-secondary:hover {
    background: #f0f9ff;
  }
`;

document.head.appendChild(style);
