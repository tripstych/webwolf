/**
 * Checkout Flow Manager
 * Handles multi-step checkout process
 */

class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.checkoutData = {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'US',
      payment_method: 'stripe'
    };
    this.init();
  }

  init() {
    // Display initial step
    this.showStep(1);

    // Load cart summary
    this.updateSummary();

    // Subscribe to cart changes
    if (window.cart) {
      window.cart.subscribe(() => this.updateSummary());
    }

    // Handle payment method changes
    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.checkoutData.payment_method = e.target.value;
        this.updatePaymentUI();
      });
    });

    // Prevent form submission
    document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    // Initialize Stripe if available
    if (window.stripePayment) {
      window.stripePayment.init();
    }
  }

  /**
   * Go to a specific step
   */
  goToStep(step) {
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    this.currentStep = step;
    this.showStep(step);
  }

  /**
   * Show a specific step
   */
  showStep(step) {
    document.querySelectorAll('.checkout-step').forEach(el => {
      el.classList.add('hidden');
    });

    const stepEl = document.querySelector(`[data-step="${step}"]`);
    if (stepEl) {
      stepEl.classList.remove('hidden');
    }

    // Scroll to top
    document.querySelector('.checkout-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Validate current step data
   */
  validateStep(step) {
    const form = document.getElementById('checkout-form');

    if (step === 1) {
      const email = document.getElementById('email')?.value;
      if (!email || !this.isValidEmail(email)) {
        alert('Please enter a valid email address');
        return false;
      }
      this.checkoutData.email = email;
    }

    if (step === 2) {
      const firstName = document.getElementById('first_name')?.value;
      const lastName = document.getElementById('last_name')?.value;
      const address1 = document.getElementById('address1')?.value;
      const city = document.getElementById('city')?.value;
      const province = document.getElementById('province')?.value;
      const postalCode = document.getElementById('postal_code')?.value;
      const country = document.getElementById('country')?.value;

      if (!firstName || !lastName || !address1 || !city || !province || !postalCode || !country) {
        alert('Please fill in all required fields');
        return false;
      }

      this.checkoutData.first_name = firstName;
      this.checkoutData.last_name = lastName;
      this.checkoutData.address1 = address1;
      this.checkoutData.address2 = document.getElementById('address2')?.value || '';
      this.checkoutData.city = city;
      this.checkoutData.province = province;
      this.checkoutData.postal_code = postalCode;
      this.checkoutData.country = country;
      this.checkoutData.phone = document.getElementById('phone')?.value || '';
    }

    return true;
  }

  /**
   * Place order
   */
  async placeOrder() {
    const btn = document.getElementById('place-order-btn');
    if (!btn || this.currentStep !== 3) return;

    // Prevent double submission
    if (btn.dataset.submitting === 'true') {
      return;
    }

    try {
      // Validate final step
      if (!this.validateStep(3)) {
        return;
      }

      btn.disabled = true;
      btn.dataset.submitting = 'true';
      btn.textContent = 'Processing...';

      // Get cart data
      if (!window.cart) {
        throw new Error('Cart not available');
      }

      const cart = window.cart.getCart();
      const cartItems = cart.items || [];

      if (cartItems.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Process payment based on method
      let paymentIntentId = null;
      let paypalOrderId = null;

      if (this.checkoutData.payment_method === 'stripe') {
        if (!window.stripePayment) {
          throw new Error('Stripe payment not available');
        }
        paymentIntentId = await window.stripePayment.processPayment(
          cart.totals.total,
          this.checkoutData.email
        );
      } else if (this.checkoutData.payment_method === 'paypal') {
        if (!window.paypalPayment) {
          throw new Error('PayPal payment not available');
        }
        paypalOrderId = await window.paypalPayment.processPayment(
          cart.totals.total,
          this.checkoutData.email
        );
      }

      // Create order
      const orderData = {
        email: this.checkoutData.email,
        first_name: this.checkoutData.first_name,
        last_name: this.checkoutData.last_name,
        phone: this.checkoutData.phone,
        billing_address: {
          first_name: this.checkoutData.first_name,
          last_name: this.checkoutData.last_name,
          address1: this.checkoutData.address1,
          address2: this.checkoutData.address2,
          city: this.checkoutData.city,
          province: this.checkoutData.province,
          postal_code: this.checkoutData.postal_code,
          country: this.checkoutData.country
        },
        shipping_address: {
          first_name: this.checkoutData.first_name,
          last_name: this.checkoutData.last_name,
          address1: this.checkoutData.address1,
          address2: this.checkoutData.address2,
          city: this.checkoutData.city,
          province: this.checkoutData.province,
          postal_code: this.checkoutData.postal_code,
          country: this.checkoutData.country
        },
        payment_method: this.checkoutData.payment_method,
        payment_intent_id: paymentIntentId,
        paypal_order_id: paypalOrderId,
        cart_items: cartItems,
        subtotal: cart.totals.subtotal,
        tax: cart.totals.tax,
        shipping: cart.totals.shipping,
        discount: 0,
        total: cart.totals.total
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const order = await response.json();

      // Clear cart
      await window.cart.clear();

      // Redirect to confirmation (strip # from order number)
      const orderNumberClean = order.order_number.replace('#', '');
      window.location.href = `/order-confirmation/${orderNumberClean}`;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  }

  /**
   * Update payment UI based on selected method
   */
  updatePaymentUI() {
    const stripeDiv = document.getElementById('stripe-payment');
    const paypalDiv = document.getElementById('paypal-payment');

    if (this.checkoutData.payment_method === 'stripe') {
      stripeDiv?.classList.remove('hidden');
      paypalDiv?.classList.add('hidden');
    } else if (this.checkoutData.payment_method === 'paypal') {
      stripeDiv?.classList.add('hidden');
      paypalDiv?.classList.remove('hidden');
    }
  }

  /**
   * Update order summary
   */
  updateSummary() {
    if (!window.cart) return;

    const cart = window.cart.getCart();
    const items = cart.items || [];
    const totals = cart.totals || {};

    const summaryItems = document.getElementById('summary-items');
    if (!summaryItems) return;

    if (items.length === 0) {
      summaryItems.innerHTML = '<div class="loading">Your cart is empty</div>';
      return;
    }

    const itemsHtml = items.map((item, index) => `
      <div class="summary-item">
        <span>${item.quantity}x Product #${item.productId}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    summaryItems.innerHTML = itemsHtml;

    // Update totals
    document.getElementById('summary-subtotal').textContent = '$' + parseFloat(totals.subtotal || 0).toFixed(2);
    document.getElementById('summary-shipping').textContent = '$' + parseFloat(totals.shipping || 0).toFixed(2);
    document.getElementById('summary-tax').textContent = '$' + parseFloat(totals.tax || 0).toFixed(2);
    document.getElementById('summary-total').textContent = '$' + parseFloat(totals.total || 0).toFixed(2);
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Create global instance
window.checkoutManager = new CheckoutManager();
