# Webhook Configuration Guide

This document explains how to set up payment webhooks for Stripe and PayPal in WebWolf CMS.

## How Webhooks Work

When a customer completes a payment:

1. **Frontend** completes payment with Stripe/PayPal and gets a payment intent/order ID
2. **Frontend** creates order with `payment_intent_id` or `paypal_order_id`, status starts as **pending**
3. **Payment Provider** processes the payment
4. **Payment Provider** sends webhook to your server confirming payment success/failure
5. **Webhook Handler** updates order `payment_status` to **paid**, **failed**, or **refunded**

This is production-ready because:
- ✅ Webhook signatures are verified (tamper-proof)
- ✅ Orders only marked as paid when provider confirms
- ✅ Handles payment failures and refunds
- ✅ Idempotent (safe to receive same webhook multiple times)

## Environment Variables Required

Add these to your `.env` file:

### Stripe
```env
STRIPE_PUBLIC_KEY=pk_test_...           # Public key from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_...           # Secret key from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret (created below)
```

### PayPal
```env
PAYPAL_CLIENT_ID=...                    # OAuth2 Client ID
PAYPAL_CLIENT_SECRET=...                # OAuth2 Client Secret
PAYPAL_MODE=sandbox                     # sandbox or live
PAYPAL_WEBHOOK_ID=...                   # Webhook ID (created below)
```

## Stripe Webhook Setup

### 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
5. Select events to listen for:
   - ✓ `payment_intent.succeeded`
   - ✓ `payment_intent.payment_failed`
   - ✓ `charge.refunded`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to `.env` as `STRIPE_WEBHOOK_SECRET=whsec_...`

### 2. Test in Development (Sandbox)

Use Stripe's CLI to forward webhooks to your local machine:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
```

### 3. Webhook Events Handled

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Order marked as **paid** |
| `payment_intent.payment_failed` | Order marked as **failed** |
| `charge.refunded` | Order marked as **refunded** |

## PayPal Webhook Setup

### 1. Create Webhook in PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. Navigate to **Apps & Credentials**
3. Make sure you're in the correct mode (Sandbox or Live)
4. Go to **Webhooks** (in the left sidebar)
5. Click **Create webhook**
6. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/paypal`
7. Select events to listen for:
   - ✓ `CHECKOUT.ORDER.COMPLETED`
   - ✓ `PAYMENT.CAPTURE.COMPLETED`
   - ✓ `PAYMENT.CAPTURE.REFUNDED`
   - ✓ `PAYMENT.CAPTURE.DENIED`
8. Click **Create webhook**
9. Copy the **Webhook ID**
10. Add to `.env` as `PAYPAL_WEBHOOK_ID=...`

### 2. Get OAuth Credentials

1. Go to **Apps & Credentials** → **Sandbox** (or Live)
2. Under **REST API apps**, find your app or create one
3. Copy:
   - **Client ID** → `.env` as `PAYPAL_CLIENT_ID=`
   - **Secret** → `.env` as `PAYPAL_CLIENT_SECRET=`

### 3. Test in Sandbox

1. Use PayPal's sandbox test accounts to complete orders
2. PayPal will automatically send webhook notifications
3. Check server logs to confirm webhooks are processed

### 4. Webhook Events Handled

| Event | Action |
|-------|--------|
| `CHECKOUT.ORDER.COMPLETED` (status=APPROVED) | Order marked as **paid** |
| `PAYMENT.CAPTURE.COMPLETED` | Order marked as **paid** |
| `PAYMENT.CAPTURE.REFUNDED` | Order marked as **refunded** |
| `PAYMENT.CAPTURE.DENIED` | Order marked as **failed** |

## Debugging

### Check Webhook Logs

Server logs show webhook processing:
```
✓ Stripe: Order 42 marked as paid ($99.99 USD)
✗ PayPal: Order 43 payment denied
⟲ Stripe: Order 44 refunded
```

### Stripe Webhook Testing
```bash
# View recent webhook attempts
stripe logs

# Resend a specific event
stripe trigger payment_intent.succeeded --api-version 2024-04-10
```

### PayPal Webhook Testing

1. Dashboard → Webhooks → View Details
2. Click on a webhook event to see:
   - Event details
   - Response status
   - Retry history

### Troubleshooting

**Webhook returns 401 (Invalid signature)**
- Verify `STRIPE_WEBHOOK_SECRET` or `PAYPAL_WEBHOOK_ID` in `.env`
- Make sure endpoint URL matches exactly in webhook configuration
- Check that raw body capture middleware is working

**Order not updating to "paid"**
- Check server logs for webhook events
- Verify payment_intent_id or paypal_order_id matches in database
- Ensure order exists in database before webhook arrives

**Webhooks not being sent**
- Stripe: Check webhook status in Dashboard → Developers → Webhooks
- PayPal: Check webhook history in Dashboard → Webhooks
- Verify endpoint URL is publicly accessible (not localhost)

## Production Deployment

When deploying to production:

1. ✅ Update `.env` with **LIVE** credentials (not sandbox)
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=live_client_id
   ```

2. ✅ Create **LIVE** webhooks in Stripe/PayPal dashboards
   - Point to your production URL: `https://yourdomain.com/api/webhooks/stripe`
   - Copy the live signing secrets

3. ✅ Monitor webhook delivery
   - Stripe Dashboard: Developers → Webhooks → View details
   - PayPal Dashboard: Webhooks → View details

4. ✅ Set up alerts for failed webhooks
   - Stripe: Dashboard → Developers → Events
   - PayPal: Webhooks configuration

## Order Payment Status Flow

```
Order Created (payment_status = 'pending')
         ↓
Customer completes payment
         ↓
Payment Provider processes payment
         ↓
Webhook sent to your server
         ↓
Signature verified ✓
         ↓
Order updated (payment_status = 'paid'|'failed'|'refunded')
```

## API Endpoints

### Webhook Endpoints (POST)
- `POST /api/webhooks/stripe` - Stripe payment webhooks
- `POST /api/webhooks/paypal` - PayPal payment webhooks

### Manual Payment Status Update (Admin)
```bash
PUT /api/orders/:id/payment-status
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "payment_status": "paid" | "pending" | "failed" | "refunded"
}
```

This allows admins to manually override payment status if needed (e.g., if payment was made through alternative method).
