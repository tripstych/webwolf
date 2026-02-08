/**
 * PayPal Payment Handler
 * Handles PayPal Buttons integration
 */

class PayPalPaymentHandler {
  constructor() {
    this.loaded = false;
    this.orderId = null;
    this.captureId = null;
  }

  /**
   * Initialize PayPal
   */
  async init(clientId = null) {
    try {
      if (this.loaded) return;

      // Get PayPal client ID from settings
      const id = clientId || window.PAYPAL_CLIENT_ID || document.querySelector('[data-paypal-client-id]')?.dataset.paypalClientId;

      if (!id) {
        console.warn('PayPal client ID not found. PayPal payments disabled.');
        return;
      }

      // Load PayPal SDK
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=USD`;
        script.async = true;

        script.onload = () => {
          this.loaded = true;
          this.renderButtons();
          resolve();
        };

        script.onerror = () => {
          reject(new Error('Failed to load PayPal SDK'));
        };

        document.head.appendChild(script);
      });
    } catch (err) {
      console.error('Failed to initialize PayPal:', err);
      throw err;
    }
  }

  /**
   * Render PayPal buttons
   */
  renderButtons() {
    try {
      if (!window.paypal) {
        console.error('PayPal SDK not loaded');
        return;
      }

      const container = document.getElementById('paypal-button-container');
      if (!container) {
        console.warn('PayPal button container not found');
        return;
      }

      paypal.Buttons({
        createOrder: (data, actions) => {
          return this.createOrder();
        },

        onApprove: (data, actions) => {
          return this.captureOrder(data.orderID);
        },

        onError: (err) => {
          console.error('PayPal error:', err);
          alert('An error occurred during the PayPal checkout. Please try again.');
        },

        onCancel: (data) => {
          console.log('PayPal checkout cancelled');
        }
      }).render('#paypal-button-container');
    } catch (err) {
      console.error('Error rendering PayPal buttons:', err);
    }
  }

  /**
   * Create PayPal order
   */
  async createOrder() {
    try {
      if (!window.checkoutManager) {
        throw new Error('Checkout manager not available');
      }

      const cart = window.cart?.getCart();
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const amount = cart.totals?.total || 0;

      const response = await fetch('/api/payments/paypal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'USD'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create PayPal order');
      }

      const data = await response.json();
      this.orderId = data.orderId;

      return data.orderId;
    } catch (err) {
      console.error('Create PayPal order error:', err);
      throw err;
    }
  }

  /**
   * Capture PayPal order
   */
  async captureOrder(orderId) {
    try {
      const response = await fetch('/api/payments/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to capture PayPal order');
      }

      const data = await response.json();
      this.captureId = data.captureId;

      return data;
    } catch (err) {
      console.error('Capture PayPal order error:', err);
      throw err;
    }
  }

  /**
   * Process payment (used by checkout manager)
   */
  async processPayment(amount, customerEmail) {
    try {
      // In PayPal flow, the buttons handle the full flow
      // This method is called after the user has completed PayPal approval
      if (!this.captureId) {
        throw new Error('PayPal payment not completed');
      }

      return this.orderId;
    } catch (err) {
      console.error('PayPal payment error:', err);
      throw err;
    }
  }
}

// Create global instance
window.paypalPayment = new PayPalPaymentHandler();

// Auto-initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if PayPal button container exists
    if (document.getElementById('paypal-button-container')) {
      window.paypalPayment.init().catch(err => {
        console.error('PayPal initialization failed:', err);
      });
    }
  });
} else {
  // Only initialize if PayPal button container exists
  if (document.getElementById('paypal-button-container')) {
    window.paypalPayment.init().catch(err => {
      console.error('PayPal initialization failed:', err);
    });
  }
}
