import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';

const router = Router();

/**
 * Helper: Generate order number
 */
async function generateOrderNumber() {
  // Get the last order number
  const results = await query(
    `SELECT order_number FROM orders ORDER BY id DESC LIMIT 1`
  );

  let nextNumber = 1001;
  if (results.length > 0) {
    const lastNumber = parseInt(results[0].order_number.replace('#', ''));
    nextNumber = lastNumber + 1;
  }

  return `#${nextNumber}`;
}

/**
 * Helper: Get customer or create one
 */
async function upsertCustomer(email, firstName, lastName, phone, userId = null) {
  // Check if customer exists
  const existing = await query(
    'SELECT id FROM customers WHERE email = ?',
    [email]
  );

  if (existing[0]) {
    // Update customer
    await query(
      `UPDATE customers SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [firstName, lastName, phone, existing[0].id]
    );
    return existing[0].id;
  } else {
    // Create new customer
    const result = await query(
      `INSERT INTO customers (email, first_name, last_name, phone, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [email, firstName, lastName, phone, userId || null]
    );
    return result.insertId;
  }
}

/**
 * Helper: Create order items from cart
 */
async function createOrderItems(orderId, cartItems) {
  for (const item of cartItems) {
    let productTitle = '';
    let variantTitle = '';
    let sku = '';

    // Get product details
    const product = await query(
      `SELECT p.sku, c.title FROM products p
       LEFT JOIN content c ON p.content_id = c.id
       WHERE p.id = ?`,
      [item.productId]
    );

    if (product[0]) {
      productTitle = product[0].title || '';
      sku = product[0].sku || '';
    }

    // Get variant details if applicable
    let variantId = null;
    if (item.variantId) {
      const variant = await query(
        'SELECT id, title FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      if (variant[0]) {
        variantId = variant[0].id;
        variantTitle = variant[0].title || '';
      }
    }

    await query(
      `INSERT INTO order_items (
        order_id, product_id, variant_id, product_title, variant_title, sku,
        price, quantity, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        item.productId,
        variantId,
        productTitle,
        variantTitle,
        sku,
        item.price,
        item.quantity,
        item.price * item.quantity
      ]
    );
  }
}

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
    const customerId = await upsertCustomer(
      email,
      first_name,
      last_name,
      phone,
      req.user?.id
    );

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order with pending payment status
    // Payment status will be updated by webhook when payment provider confirms
    const orderResult = await query(
      `INSERT INTO orders (
        order_number, customer_id, email,
        billing_address, shipping_address,
        shipping_method, payment_method,
        payment_intent_id, paypal_order_id,
        subtotal, tax, shipping, discount, total,
        status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerId,
        email,
        JSON.stringify(billing_address || {}),
        JSON.stringify(shipping_address || {}),
        shipping_method || null,
        payment_method || 'cod',
        payment_intent_id || null,
        paypal_order_id || null,
        subtotal || 0,
        tax || 0,
        shipping || 0,
        discount || 0,
        total || 0,
        'pending',
        'pending'  // Webhook will update to 'paid' when payment confirmed
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items
    await createOrderItems(orderId, cart_items);

    // Deduct inventory for each item
    for (const item of cart_items) {
      if (item.variantId) {
        await query(
          `UPDATE product_variants SET inventory_quantity = inventory_quantity - ? WHERE id = ?`,
          [item.quantity, item.variantId]
        );
      } else {
        await query(
          `UPDATE products SET inventory_quantity = inventory_quantity - ? WHERE id = ?`,
          [item.quantity, item.productId]
        );
      }
    }

    // Get created order
    const orders = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const order = orders[0];

    // Parse JSON fields
    if (order.billing_address) {
      order.billing_address = JSON.parse(order.billing_address);
    }
    if (order.shipping_address) {
      order.shipping_address = JSON.parse(order.shipping_address);
    }

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
    const orders = await query(
      'SELECT * FROM orders WHERE order_number = ?',
      [req.params.orderNumber]
    );

    if (!orders[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Parse JSON fields
    if (order.billing_address) {
      order.billing_address = JSON.parse(order.billing_address);
    }
    if (order.shipping_address) {
      order.shipping_address = JSON.parse(order.shipping_address);
    }

    // Get order items
    const items = await query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = items;

    res.json(order);
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
    const orders = await query(
      'SELECT * FROM orders WHERE id = ?',
      [parseInt(req.params.id)]
    );

    if (!orders[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Parse JSON fields
    if (order.billing_address) {
      order.billing_address = JSON.parse(order.billing_address);
    }
    if (order.shipping_address) {
      order.shipping_address = JSON.parse(order.shipping_address);
    }

    // Get order items
    const items = await query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = items;

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

    let sql = `
      SELECT o.*, c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      sql += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (search) {
      sql += ' AND (o.order_number LIKE ? OR o.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ` ORDER BY o.created_at DESC LIMIT ${pageLimit} OFFSET ${pageOffset}`;

    const orders = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM orders o WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND o.status = ?';
      countParams.push(status);
    }
    if (payment_status) {
      countSql += ' AND o.payment_status = ?';
      countParams.push(payment_status);
    }
    if (search) {
      countSql += ' AND (o.order_number LIKE ? OR o.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.count || 0;

    res.json({
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
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

    const result = await query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, parseInt(req.params.id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orders = await query('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    res.json(orders[0]);
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

    const result = await query(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [payment_status, parseInt(req.params.id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orders = await query('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    res.json(orders[0]);
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
    const { tracking_number, shipped_at } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    const result = await query(
      'UPDATE orders SET tracking_number = ?, shipped_at = ?, status = ? WHERE id = ?',
      [tracking_number, shipped_at || new Date(), 'shipped', parseInt(req.params.id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orders = await query('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    res.json(orders[0]);
  } catch (err) {
    console.error('Update tracking error:', err);
    res.status(500).json({ error: 'Failed to update tracking information' });
  }
});

export default router;
