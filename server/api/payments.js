import { Router } from 'express';
import { query } from '../db/connection.js';
import axios from 'axios';

const router = Router();

/**
 * Create Stripe payment intent
 */
router.post('/stripe/intent', async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get Stripe secret key from settings
    const settings = await query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['stripe_secret_key']
    );

    if (!settings[0] || !settings[0].setting_value) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripeSecretKey = settings[0].setting_value;

    // Create payment intent using Stripe API
    // Note: In production, use the Stripe SDK
    const response = await axios.post(
      'https://api.stripe.com/v1/payment_intents',
      `amount=${Math.round(amount * 100)}&currency=${currency.toLowerCase()}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const paymentIntent = response.data;

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
  } catch (err) {
    console.error('Create Stripe intent error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: err.response?.data?.error?.message
    });
  }
});

/**
 * Confirm Stripe payment intent
 */
router.post('/stripe/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID required' });
    }

    // Get Stripe secret key
    const settings = await query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['stripe_secret_key']
    );

    if (!settings[0]) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripeSecretKey = settings[0].setting_value;

    // Retrieve payment intent status
    const response = await axios.get(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`
        }
      }
    );

    const paymentIntent = response.data;

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Confirm Stripe payment error:', err.message);
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: err.response?.data?.error?.message
    });
  }
});

/**
 * Create PayPal order
 */
router.post('/paypal/order', async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get PayPal settings
    const settings = await query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?, ?)',
      ['paypal_client_id', 'paypal_client_secret', 'paypal_mode']
    );

    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = s.setting_value;
    }

    if (!settingsMap.paypal_client_id || !settingsMap.paypal_client_secret) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }

    const mode = settingsMap.paypal_mode || 'sandbox';
    const baseURL = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Get access token
    const tokenResponse = await axios.post(
      `${baseURL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: settingsMap.paypal_client_id,
          password: settingsMap.paypal_client_secret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Create order
    const orderResponse = await axios.post(
      `${baseURL}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const order = orderResponse.data;

    res.json({
      orderId: order.id,
      status: order.status
    });
  } catch (err) {
    console.error('Create PayPal order error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create PayPal order',
      details: err.response?.data?.message
    });
  }
});

/**
 * Capture PayPal order
 */
router.post('/paypal/capture', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
    }

    // Get PayPal settings
    const settings = await query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?, ?)',
      ['paypal_client_id', 'paypal_client_secret', 'paypal_mode']
    );

    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = s.setting_value;
    }

    if (!settingsMap.paypal_client_id) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }

    const mode = settingsMap.paypal_mode || 'sandbox';
    const baseURL = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Get access token
    const tokenResponse = await axios.post(
      `${baseURL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: settingsMap.paypal_client_id,
          password: settingsMap.paypal_client_secret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Capture order
    const captureResponse = await axios.post(
      `${baseURL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const capturedOrder = captureResponse.data;
    const captureId = capturedOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    res.json({
      status: capturedOrder.status,
      orderId: capturedOrder.id,
      captureId
    });
  } catch (err) {
    console.error('Capture PayPal order error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to capture PayPal order',
      details: err.response?.data?.message
    });
  }
});

export default router;
