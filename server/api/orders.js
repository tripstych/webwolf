import { Router } from 'express';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import { OrderRepository } from '../db/repositories/OrderRepository.js';
import { CustomerRepository } from '../db/repositories/CustomerRepository.js';

const router = Router();
const orderRepo = new OrderRepository();
const customerRepo = new CustomerRepository();

/**
 * Create order from cart
 */
router.post('/', async (req, res) => {
  try {
    const {
      email,
      first_name,
      last_name,
      phone,
      billing_address,
      shipping_address,
      shipping_method,
      payment_method,
      payment_intent_id,
      paypal_order_id,
      cart_items,
      subtotal,
      tax,
      shipping,
      discount,
      total
    } = req.body;

    // Validate required fields
    if (!email || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        error: 'Email and cart items are required'
      });
    }

    // Upsert customer
    const customerId = await customerRepo.upsertCustomer(
      email,
      first_name,
      last_name,
      phone,
      req.user?.id
    );

    // Generate order number
    const orderNumber = await orderRepo.generateOrderNumber();

    // Create order with pending payment status
    // Payment status will be updated by webhook when payment provider confirms
    const orderId = await orderRepo.create({
      order_number: orderNumber,
      customer_id: customerId,
      email,
      billing_address: JSON.stringify(billing_address || {}),
      shipping_address: JSON.stringify(shipping_address || {}),
      shipping_method: shipping_method || null,
      payment_method: payment_method || 'cod',
      payment_intent_id: payment_intent_id || null,
      paypal_order_id: paypal_order_id || null,
      subtotal: subtotal || 0,
      tax: tax || 0,
      shipping: shipping || 0,
      discount: discount || 0,
      total: total || 0,
      status: 'pending',
      payment_status: 'pending'  // Webhook will update to 'paid' when payment confirmed
    });

    // Create order items
    await orderRepo.createOrderItems(orderId, cart_items);

    // Deduct inventory
    await orderRepo.deductInventory(cart_items);

    // Get created order with parsed JSON
    const order = await orderRepo.getWithItems(orderId);

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Get order by number (guest checkout)
 */
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const order = await orderRepo.findByOrderNumber(req.params.orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order with items and parsed JSON
    const orderWithItems = await orderRepo.getWithItems(order.id);
    res.json(orderWithItems);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

/**
 * Get order by ID (authenticated)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await orderRepo.getWithItems(parseInt(req.params.id));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

/**
 * List orders (admin)
 */
router.get('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { status, payment_status, search, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const orders = await orderRepo.listWithFilters(
      { status, payment_status, search },
      pageLimit,
      pageOffset
    );

    const total = await orderRepo.countWithFilters({ status, payment_status, search });

    res.json({
      data: orders,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

/**
 * Update order status (admin)
 */
router.put('/:id/status', requireAuth, requireEditor, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await orderRepo.updateStatus(parseInt(req.params.id), status);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * Update payment status (admin)
 */
router.put('/:id/payment-status', requireAuth, requireEditor, async (req, res) => {
  try {
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }

    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await orderRepo.updatePaymentStatus(parseInt(req.params.id), payment_status);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

/**
 * Add tracking number to order (admin)
 */
router.put('/:id/tracking', requireAuth, requireEditor, async (req, res) => {
  try {
    const { tracking_number, shipping_method } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    const order = await orderRepo.addTracking(parseInt(req.params.id), tracking_number, shipping_method);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Update tracking error:', err);
    res.status(500).json({ error: 'Failed to update tracking information' });
  }
});

export default router;
