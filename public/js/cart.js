/**
 * Shopping Cart Manager
 * Handles client-side cart state with localStorage persistence and API sync
 */

class CartManager {
  constructor() {
    this.cart = this.loadFromLocalStorage();
    this.listeners = [];
    this.apiKey = 'api_cart';
  }

  /**
   * Load cart from localStorage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('webwolf_cart');
      if (!stored) {
        return { items: [], totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 } };
      }
      return JSON.parse(stored);
    } catch (err) {
      console.error('Failed to load cart from localStorage:', err);
      return { items: [], totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 } };
    }
  }

  /**
   * Save cart to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('webwolf_cart', JSON.stringify(this.cart));
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err);
    }
  }

  /**
   * Sync cart with server via API
   * Only overwrites local cart if server has more items
   */
  async syncWithServer() {
    try {
      const response = await fetch('/api/cart', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const serverCart = await response.json();

        // Only update from server if it has items and local cart is empty
        // This prevents empty server sessions from clearing the local cart
        const localItemCount = this.cart.items.length;
        const serverItemCount = (serverCart.items || []).length;

        if (serverItemCount > 0 || localItemCount === 0) {
          this.cart = serverCart;
          this.saveToLocalStorage();
          this.notify();
        }
        // If local has items and server is empty, keep local cart
      }
    } catch (err) {
      console.error('Failed to sync cart with server:', err);
    }
  }

  /**
   * Add item to cart
   */
  async addItem(productId, variantId = null, quantity = 1, price) {
    try {
      if (!price && typeof price !== 'number') {
        throw new Error('Price is required');
      }

      quantity = Math.max(1, parseInt(quantity) || 1);

      // Check if item already exists
      const existingIndex = this.cart.items.findIndex(
        item => item.productId === productId && item.variantId === variantId
      );

      if (existingIndex >= 0) {
        // Update quantity
        this.cart.items[existingIndex].quantity += quantity;
      } else {
        // Add new item
        this.cart.items.push({
          id: `${productId}-${variantId || 'base'}`,
          productId,
          variantId,
          quantity,
          price: parseFloat(price)
        });
      }

      // Calculate totals (simplified - should come from server for accuracy)
      await this.calculateTotals();

      // Sync to server
      await fetch('/api/cart/items', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
          price: parseFloat(price)
        })
      });

      this.saveToLocalStorage();
      this.notify();

      return true;
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      throw err;
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(itemIndex, quantity) {
    try {
      quantity = parseInt(quantity) || 0;

      if (quantity <= 0) {
        // Remove item
        return await this.removeItem(itemIndex);
      }

      if (itemIndex < 0 || itemIndex >= this.cart.items.length) {
        throw new Error('Item not found');
      }

      this.cart.items[itemIndex].quantity = quantity;

      // Calculate totals
      await this.calculateTotals();

      // Sync to server
      await fetch(`/api/cart/items/${itemIndex}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      this.saveToLocalStorage();
      this.notify();

      return true;
    } catch (err) {
      console.error('Failed to update item quantity:', err);
      throw err;
    }
  }

  /**
   * Remove item from cart by item ID
   */
  async removeItem(itemIdOrIndex) {
    try {
      let itemIndex;

      // Support both item ID (string) and array index (number)
      if (typeof itemIdOrIndex === 'string') {
        itemIndex = this.cart.items.findIndex(item => item.id === itemIdOrIndex);
      } else {
        itemIndex = itemIdOrIndex;
      }

      if (itemIndex < 0 || itemIndex >= this.cart.items.length) {
        throw new Error('Item not found');
      }

      const item = this.cart.items[itemIndex];
      this.cart.items.splice(itemIndex, 1);

      // Calculate totals
      await this.calculateTotals();

      // Sync to server using item ID
      await fetch(`/api/cart/items/${item.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      this.saveToLocalStorage();
      this.notify();

      return true;
    } catch (err) {
      console.error('Failed to remove item from cart:', err);
      throw err;
    }
  }

  /**
   * Clear entire cart
   */
  async clear() {
    try {
      this.cart = { items: [], totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 } };

      // Sync to server
      await fetch('/api/cart/clear', {
        method: 'POST',
        credentials: 'include'
      });

      this.saveToLocalStorage();
      this.notify();

      return true;
    } catch (err) {
      console.error('Failed to clear cart:', err);
      throw err;
    }
  }

  /**
   * Calculate totals from current items
   */
  async calculateTotals(shippingAddress = null) {
    try {
      const response = await fetch('/api/cart/totals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: this.cart.items,
          shippingAddress
        })
      });

      if (response.ok) {
        this.cart.totals = await response.json();
      }
    } catch (err) {
      // Fallback to local calculation
      let subtotal = 0;
      for (const item of this.cart.items) {
        subtotal += (item.price || 0) * (item.quantity || 0);
      }

      // Simplified calculation without tax/shipping
      this.cart.totals = {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: 0,
        shipping: 0,
        total: parseFloat(subtotal.toFixed(2))
      };
    }
  }

  /**
   * Get current cart
   */
  getCart() {
    return { ...this.cart };
  }

  /**
   * Get cart item count
   */
  getItemCount() {
    return this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get cart totals
   */
  getTotals() {
    return { ...this.cart.totals };
  }

  /**
   * Subscribe to cart changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getCart());
      } catch (err) {
        console.error('Error in cart listener:', err);
      }
    }
  }
}

// Create global cart instance
window.cart = new CartManager();

// Sync cart on page load
window.addEventListener('load', () => {
  window.cart.syncWithServer().catch(err => {
    console.error('Failed to sync cart on load:', err);
  });
});

// Save cart before unload
window.addEventListener('beforeunload', () => {
  window.cart.saveToLocalStorage();
});
