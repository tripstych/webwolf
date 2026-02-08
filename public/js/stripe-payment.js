/**
 * Stripe Payment Handler
 * Handles Stripe payment processing with Elements
 */

class StripePaymentHandler {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    this.clientSecret = null;
    this.paymentIntentId = null;
  }

  /**
   * Initialize Stripe
   */
  async init() {
    try {
      // Wait for Stripe public key to be available
      let retries = 0;
      while (!window.STRIPE_PUBLIC_KEY && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      const publicKey = window.STRIPE_PUBLIC_KEY || document.querySelector('[data-stripe-key]')?.dataset.stripeKey;

      if (!publicKey) {
        console.warn('Stripe public key not found. Stripe payments disabled.');
        return;
      }

      // Wait for Stripe SDK to be loaded
      if (typeof Stripe === 'undefined') {
        console.warn('Stripe SDK not loaded. Stripe payments disabled.');
        return;
      }

      this.stripe = Stripe(publicKey);
      this.elements = this.stripe.elements();
      this.cardElement = this.elements.create('card');

      // Mount card element
      const cardContainer = document.getElementById('card-element');
      if (cardContainer) {
        this.cardElement.mount('#card-element');
        console.log('Stripe card element mounted');

        // Handle card errors
        this.cardElement.addEventListener('change', (event) => {
          const errorDiv = document.getElementById('card-errors');
          if (event.error && errorDiv) {
            errorDiv.textContent = event.error.message;
          } else if (errorDiv) {
            errorDiv.textContent = '';
          }
        });
      } else {
        console.warn('Card element container not found');
      }
    } catch (err) {
      console.error('Failed to initialize Stripe:', err);
    }
  }

  /**
   * Process payment with card element
   */
  async processPayment(amount, customerEmail) {
    try {
      if (!this.stripe || !this.cardElement) {
        throw new Error('Stripe not initialized');
      }

      // Create payment intent
      const intentResponse = await fetch('/api/payments/stripe/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'USD'
        })
      });

      if (!intentResponse.ok) {
        const data = await intentResponse.json();
        throw new Error(data.error || 'Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = await intentResponse.json();
      this.clientSecret = clientSecret;
      this.paymentIntentId = paymentIntentId;

      // Confirm payment
      const confirmResult = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            email: customerEmail
          }
        }
      });

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      if (confirmResult.paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment failed with status: ${confirmResult.paymentIntent.status}`);
      }

      return paymentIntentId;
    } catch (err) {
      console.error('Stripe payment error:', err);
      throw err;
    }
  }

  /**
   * Handle 3D Secure authentication if needed
   */
  async handle3DSecure(clientSecret) {
    try {
      const result = await this.stripe.handleCardAction(clientSecret);

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.paymentIntent.client_secret;
    } catch (err) {
      console.error('3D Secure error:', err);
      throw err;
    }
  }
}

// Create global instance
window.stripePayment = new StripePaymentHandler();

// Auto-initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.stripePayment.init();
  });
} else {
  window.stripePayment.init();
}
