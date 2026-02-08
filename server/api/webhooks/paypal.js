import { Router } from 'express';
import { query } from '../../db/connection.js';
import axios from 'axios';

const router = Router();

/**
 * Verify PayPal webhook signature
 */
async function verifyPayPalSignature(event, transmissionId, transmissionTime, certUrl, signature) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      console.warn('PayPal webhook: Missing webhook ID');
      return false;
    }

    // Get PayPal auth token
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    const authResponse = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: clientSecret }
      }
    );

    const accessToken = authResponse.data.access_token;

    // Verify with PayPal
    const verifyResponse = await axios.post(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: 'SHA256withRSA',
        webhook_id: webhookId,
        webhook_event: event,
        signature: signature
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return verifyResponse.data.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('PayPal signature verification error:', err.message);
    return false;
  }
}

/**
 * Handle PayPal webhooks
 */
router.post('/', async (req, res) => {
  const event = req.body;
  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const signature = req.headers['paypal-auth-algo'];
  const signatureValue = req.headers['paypal-transmission-sig'];

  // Verify signature
  const isValid = await verifyPayPalSignature(
    event,
    transmissionId,
    transmissionTime,
    certUrl,
    signatureValue
  );

  if (!isValid) {
    console.warn('PayPal webhook: Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(event.resource);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleCaptureRefunded(event.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handleCaptureDenied(event.resource);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    res.json({ status: 'received' });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle CHECKOUT.ORDER.COMPLETED event
 */
async function handleOrderCompleted(resource) {
  try {
    const { id, status } = resource;

    // Find order by paypal_order_id
    const orders = await query(
      'SELECT id FROM orders WHERE paypal_order_id = ?',
      [id]
    );

    if (!orders[0]) {
      console.warn(`PayPal: No order found for PayPal order ${id}`);
      return;
    }

    // If order is approved, mark as paid
    if (status === 'APPROVED') {
      await query(
        'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
        ['paid', orders[0].id]
      );

      console.log(`✓ PayPal: Order ${orders[0].id} approved and paid (PayPal Order: ${id})`);
    }
  } catch (err) {
    console.error('Error handling CHECKOUT.ORDER.COMPLETED:', err);
    throw err;
  }
}

/**
 * Handle PAYMENT.CAPTURE.COMPLETED event
 */
async function handleCaptureCompleted(resource) {
  try {
    const { id, supplementary_data } = resource;
    const paypalOrderId = supplementary_data?.related_ids?.order_id;

    if (!paypalOrderId) {
      console.warn('PayPal: Capture completed but no order ID found');
      return;
    }

    // Find order by paypal_order_id
    const orders = await query(
      'SELECT id FROM orders WHERE paypal_order_id = ?',
      [paypalOrderId]
    );

    if (!orders[0]) {
      console.warn(`PayPal: No order found for PayPal order ${paypalOrderId}`);
      return;
    }

    // Update order payment status to paid
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['paid', orders[0].id]
    );

    console.log(`✓ PayPal: Order ${orders[0].id} payment captured (Capture: ${id})`);
  } catch (err) {
    console.error('Error handling PAYMENT.CAPTURE.COMPLETED:', err);
    throw err;
  }
}

/**
 * Handle PAYMENT.CAPTURE.REFUNDED event
 */
async function handleCaptureRefunded(resource) {
  try {
    const { id, supplementary_data } = resource;
    const paypalOrderId = supplementary_data?.related_ids?.order_id;

    if (!paypalOrderId) {
      console.warn('PayPal: Capture refunded but no order ID found');
      return;
    }

    // Find order by paypal_order_id
    const orders = await query(
      'SELECT id FROM orders WHERE paypal_order_id = ?',
      [paypalOrderId]
    );

    if (!orders[0]) {
      console.warn(`PayPal: No order found for PayPal order ${paypalOrderId}`);
      return;
    }

    // Update order payment status to refunded
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['refunded', orders[0].id]
    );

    console.log(`⟲ PayPal: Order ${orders[0].id} refunded (Capture: ${id})`);
  } catch (err) {
    console.error('Error handling PAYMENT.CAPTURE.REFUNDED:', err);
    throw err;
  }
}

/**
 * Handle PAYMENT.CAPTURE.DENIED event
 */
async function handleCaptureDenied(resource) {
  try {
    const { id, supplementary_data } = resource;
    const paypalOrderId = supplementary_data?.related_ids?.order_id;

    if (!paypalOrderId) {
      console.warn('PayPal: Capture denied but no order ID found');
      return;
    }

    // Find order by paypal_order_id
    const orders = await query(
      'SELECT id FROM orders WHERE paypal_order_id = ?',
      [paypalOrderId]
    );

    if (!orders[0]) {
      console.warn(`PayPal: No order found for PayPal order ${paypalOrderId}`);
      return;
    }

    // Update order payment status to failed
    await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['failed', orders[0].id]
    );

    console.log(`✗ PayPal: Order ${orders[0].id} payment denied (Capture: ${id})`);
  } catch (err) {
    console.error('Error handling PAYMENT.CAPTURE.DENIED:', err);
    throw err;
  }
}

export default router;
