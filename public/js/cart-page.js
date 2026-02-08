/**
 * Shopping Cart Page Handler
 * Renders and manages cart items on the dedicated cart page
 */

document.addEventListener('DOMContentLoaded', async () => {
  const cartContent = document.getElementById('cart-content');

  // Subscribe to cart changes
  window.cart.subscribe(() => {
    renderCart();
  });

  // Initial render
  renderCart();

  /**
   * Render the cart
   */
  async function renderCart() {
    const cartData = window.cart.getCart();
    const items = cartData.items || [];
    const totals = cartData.totals || {};

    if (items.length === 0) {
      cartContent.innerHTML = `
        <div class="empty-cart">
          <h2>Your Cart is Empty</h2>
          <p>Add some products to get started!</p>
          <a href="/products" class="btn btn-primary">Continue Shopping</a>
        </div>
      `;
      return;
    }

    // Load product details for cart items
    const itemsWithDetails = await Promise.all(
      items.map(async (item, index) => {
        try {
          const response = await fetch(`/api/products/${item.productId}`);
          if (response.ok) {
            const product = await response.json();
            return { ...item, index, product };
          }
        } catch (err) {
          console.error('Failed to load product:', err);
        }
        return { ...item, index };
      })
    );

    const itemsHtml = itemsWithDetails.map(({ index, product, ...item }) => `
      <div class="cart-item">
        <div class="cart-item-image">
          ${product && product.og_image ? `<img src="${product.og_image}" alt="${product.title}">` : '<div style="color: #ccc;">No Image</div>'}
        </div>
        <div class="cart-item-details">
          <h3>${product?.title || 'Product'}</h3>
          ${item.variantId ? '<div class="cart-item-variant">Variant #' + item.variantId + '</div>' : ''}
          ${product?.sku ? '<div class="cart-item-sku">SKU: ' + product.sku + '</div>' : ''}
          <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <input
            type="number"
            class="qty-input"
            value="${item.quantity}"
            min="1"
            data-item-index="${index}"
            onchange="updateQuantity(this, ${index})"
          >
          <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
        </div>
      </div>
    `).join('');

    const summaryHtml = `
      <div class="cart-items">
        ${itemsHtml}
      </div>
      <div class="cart-summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>$${parseFloat(totals.subtotal || 0).toFixed(2)}</span>
        </div>
        ${totals.tax > 0 ? `
          <div class="summary-row">
            <span>Tax</span>
            <span>$${parseFloat(totals.tax).toFixed(2)}</span>
          </div>
        ` : ''}
        ${totals.shipping > 0 ? `
          <div class="summary-row">
            <span>Shipping</span>
            <span>$${parseFloat(totals.shipping).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row total">
          <span>Total</span>
          <span>$${parseFloat(totals.total || totals.subtotal || 0).toFixed(2)}</span>
        </div>
        <a href="/checkout" class="checkout-btn">Proceed to Checkout</a>
        <div class="continue-shopping">
          <a href="/products">Continue Shopping</a>
        </div>
      </div>
    `;

    cartContent.innerHTML = summaryHtml;
  }

  /**
   * Update item quantity
   */
  window.updateQuantity = async (input, index) => {
    const quantity = parseInt(input.value) || 1;
    if (quantity < 1) {
      input.value = 1;
      return;
    }

    try {
      await window.cart.updateQuantity(index, quantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);
      renderCart(); // Revert to current state
    }
  };

  /**
   * Remove item from cart
   */
  window.removeItem = async (index) => {
    if (!confirm('Remove this item from your cart?')) return;

    try {
      await window.cart.removeItem(index);
    } catch (err) {
      console.error('Failed to remove item:', err);
      alert('Failed to remove item from cart');
    }
  };
});
