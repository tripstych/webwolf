/**
 * Add to Cart Button Handler
 * Handles product page add-to-cart functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const qtyInput = document.getElementById('qty-input');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const variantOptions = document.querySelectorAll('.variant-option');

  let selectedVariantId = null;
  let selectedPrice = null;

  // Get product ID from the add-to-cart button's data attribute
  const productId = parseInt(addToCartBtn?.dataset.productId || 0);

  if (!productId || productId === 0) {
    console.error('Product ID not found on page');
    if (addToCartBtn) addToCartBtn.textContent = 'Error: Product ID missing';
    return;
  }

  // Initialize price from the page
  const priceText = document.querySelector('.product-price')?.textContent || '0.00';
  selectedPrice = parseFloat(priceText.match(/[\d.]+/)[0]);

  if (!addToCartBtn) return;

  // Quantity controls
  qtyMinus?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    qtyInput.value = Math.max(1, current - 1);
  });

  qtyPlus?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    const max = parseInt(qtyInput.max) || 999;
    qtyInput.value = Math.min(max, current + 1);
  });

  qtyInput?.addEventListener('input', () => {
    const value = parseInt(qtyInput.value) || 1;
    const max = parseInt(qtyInput.max) || 999;
    qtyInput.value = Math.max(1, Math.min(max, value));
  });

  // Variant selection
  variantOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      // Remove active class from all options in this group
      const parentGroup = option.closest('.variant-group');
      parentGroup?.querySelectorAll('.variant-option').forEach(o => {
        o.classList.remove('active');
      });

      // Add active class to clicked option
      option.classList.add('active');

      // Update selected variant and price
      selectedVariantId = parseInt(option.dataset.variantId);
      selectedPrice = parseFloat(option.dataset.variantPrice);

      // Update quantity input max
      const variantQty = option.dataset.variantQty;
      if (variantQty) {
        qtyInput.max = variantQty;
      }
    });
  });

  // Add to cart
  addToCartBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const quantity = parseInt(qtyInput.value) || 1;

    try {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Adding...';

      await window.cart.addItem(productId, selectedVariantId, quantity, selectedPrice);

      // Show success message
      const originalText = addToCartBtn.textContent;
      addToCartBtn.textContent = '✓ Added to Cart';
      addToCartBtn.style.background = '#10b981';

      setTimeout(() => {
        addToCartBtn.textContent = originalText;
        addToCartBtn.style.background = '';
        addToCartBtn.disabled = false;
      }, 2000);

      // Reset quantity
      qtyInput.value = 1;

      // Show cart drawer or notification
      showCartNotification();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert(`Failed to add to cart: ${error.message}`);
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to Cart';
    }
  });

  /**
   * Show a notification that item was added to cart
   */
  function showCartNotification() {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">✓</div>
        <div class="notification-text">
          <strong>Added to cart</strong>
          <p>Continue shopping or proceed to checkout</p>
        </div>
        <button class="notification-close">×</button>
        <a href="/cart" class="notification-action">View Cart</a>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
});

// Inject notification styles
const style = document.createElement('style');
style.textContent = `
  .cart-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 1rem;
    z-index: 1000;
    opacity: 0;
    transform: translateY(100px);
    transition: all 0.3s ease;
    max-width: 400px;
  }

  .cart-notification.show {
    opacity: 1;
    transform: translateY(0);
  }

  .notification-content {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .notification-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: #10b981;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.5rem;
  }

  .notification-text {
    flex: 1;
  }

  .notification-text strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .notification-text p {
    margin: 0;
    font-size: 0.875rem;
    color: #666;
  }

  .notification-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-close:hover {
    color: #333;
  }

  .notification-action {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .notification-action:hover {
    background: #2563eb;
  }
`;

document.head.appendChild(style);
