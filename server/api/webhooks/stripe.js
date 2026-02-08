import { Router } from 'express';
import { query } from '../../db/connection.js';
import crypto from 'crypto';

const router = Router();

/**
 * Verify Stripe webhook signature
 */
function verifyStripeSignature(body, signature, webhookSecret) {
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return hash === signature;
}

/**
 * Handle Stripe webhooks
 */
router.post('/', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify signature
  if (!webhookSecret || !signature) {
    console.warn('Stripe webhook: Missing webhook secret or signature');
    return res.status(400).json({ error: 'Missing webhook configuration' });
  }

  // Get raw body as string (required for signature verification)
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    console.warn('Stripe webhook: Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const { id, amount, currency } = paymentIntent;

    // Find order by payment_intent_id
    const orders = await query(
      'SELECT id FROM orders WHERE payment_intent_id = ?',
      [id]
    );

    if (!orders[0]) {
      console.warn(`Stripe: No order found for payment intent ${id}`);
      return;
    }

    // Update order payment status to paid
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['paid', orders[0].id]
    );

    console.log(`✓ Stripe: Order ${orders[0].id} marked as paid (${amount / 100} ${currency.toUpperCase()})`);
  } catch (err) {
    console.error('Error handling payment_intent.succeeded:', err);
    throw err;
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const { id, last_payment_error } = paymentIntent;

    // Find order by payment_intent_id
    const orders = await query(
      'SELECT id FROM orders WHERE payment_intent_id = ?',
      [id]
    );

    if (!orders[0]) {
      console.warn(`Stripe: No order found for payment intent ${id}`);
      return;
    }

    // Update order payment status to failed
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['failed', orders[0].id]
    );

    console.log(`✗ Stripe: Order ${orders[0].id} payment failed - ${last_payment_error?.message || 'Unknown error'}`);
  } catch (err) {
    console.error('Error handling payment_intent.payment_failed:', err);
    throw err;
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge) {
  try {
    const { payment_intent, amount } = charge;

    if (!payment_intent) {
      console.warn('Stripe: Refund webhook missing payment_intent');
      return;
    }

    // Find order by payment_intent_id
    const orders = await query(
      'SELECT id FROM orders WHERE payment_intent_id = ?',
      [payment_intent]
    );

    if (!orders[0]) {
      console.warn(`Stripe: No order found for payment intent ${payment_intent}`);
      return;
    }

    // Update order payment status to refunded
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['refunded', orders[0].id]
    );

    console.log(`⟲ Stripe: Order ${orders[0].id} refunded (${amount / 100} units)`);
  } catch (err) {
    console.error('Error handling charge.refunded:', err);
    throw err;
  }
}

export default router;
