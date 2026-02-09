import { Router } from 'express';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * Generate unique order number
 */
async function generateOrderNumber() {
  const lastOrder = await prisma.orders.findFirst({
    orderBy: { id: 'desc' },
    select: { order_number: true }
  });

  if (!lastOrder) return '#1001';

  const lastNum = parseInt(lastOrder.order_number.replace('#', ''));
  return `#${lastNum + 1}`;
}

/**
 * Deduct inventory for order items
 */
async function deductInventory(cartItems) {
  for (const item of cartItems) {
    if (item.variant_id) {
      // Update variant inventory
      const variant = await prisma.product_variants.findUnique({
        where: { id: item.variant_id }
      });
      if (variant) {
        await prisma.product_variants.update({
          where: { id: item.variant_id },
          data: {
            inventory_quantity: Math.max(0, (variant.inventory_quantity || 0) - item.quantity)
          }
        });
      }
    } else if (item.product_id) {
      // Update product inventory
      const product = await prisma.products.findUnique({
        where: { id: item.product_id }
      });
      if (product) {
        await prisma.products.update({
          where: { id: item.product_id },
          data: {
            inventory_quantity: Math.max(0, (product.inventory_quantity || 0) - item.quantity)
          }
        });
      }
    }
  }
}

/**
 * Create or update customer
 */
async function upsertCustomer(email, firstName, lastName, phone) {
  return await prisma.customers.upsert({
    where: { email },
    update: {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined
    },
    create: {
      email,
      first_name: firstName,
      last_name: lastName,
      phone
    }
  });
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
      payment_method,
      payment_intent_id,
      paypal_order_id,
      cart_items,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      customer_note
    } = req.body;

    // Validate required fields
    if (!email || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        error: 'Email and cart items are required'
      });
    }

    if (!billing_address || !shipping_address) {
      return res.status(400).json({
        error: 'Billing and shipping addresses are required'
      });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Upsert customer
    const customer = await upsertCustomer(email, first_name, last_name, phone);

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = await prisma.orders.create({
      data: {
        order_number: orderNumber,
        customer_id: customer.id,
        email,
        billing_address: JSON.stringify(billing_address),
        shipping_address: JSON.stringify(shipping_address),
        payment_method,
        payment_intent_id: payment_intent_id || null,
        paypal_order_id: paypal_order_id || null,
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        shipping: parseFloat(shipping) || 0,
        discount: parseFloat(discount) || 0,
        total: parseFloat(total) || 0,
        status: 'pending',
        payment_status: 'pending',
        customer_note: customer_note || null,
        order_items: {
          createMany: {
            data: cart_items.map(item => ({
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              product_title: item.product_title || 'Unknown',
              variant_title: item.variant_title || null,
              sku: item.sku || '',
              price: parseFloat(item.price) || 0,
              quantity: item.quantity || 1,
              subtotal: parseFloat(item.subtotal) || 0
            }))
          }
        }
      },
      include: {
        order_items: true,
        customers: true
      }
    });

    // Deduct inventory
    await deductInventory(cart_items);

    res.status(201).json({
      order_number: order.order_number,
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Get order by order number (guest)
 */
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const order = await prisma.orders.findUnique({
      where: { order_number: req.params.orderNumber },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true
          }
        },
        customers: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      ...order,
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : {},
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : {}
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

/**
 * Get order detail (authenticated)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true
          }
        },
        customers: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      ...order,
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : {},
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : {}
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

/**
 * List orders with filters
 */
router.get('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { status, payment_status, search, limit = 50, offset = 0 } = req.query;

    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (search) {
      where.OR = [
        { order_number: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const orders = await prisma.orders.findMany({
      where,
      include: {
        customers: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        },
        order_items: {
          select: {
            id: true,
            product_id: true,
            quantity: true,
            price: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: pageLimit,
      skip: pageOffset
    });

    const total = await prisma.orders.count({ where });

    res.json({
      data: orders,
      pagination: { total, limit: pageLimit, offset: pageOffset }
    });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

/**
 * Update order status
 */
router.put('/:id/status', requireAuth, requireEditor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.orders.update({
      where: { id: orderId },
      data: { status }
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * Update payment status
 */
router.put('/:id/payment-status', requireAuth, requireEditor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }

    const updated = await prisma.orders.update({
      where: { id: orderId },
      data: {
        payment_status,
        status: payment_status === 'paid' ? 'processing' : undefined
      }
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('Update payment status error:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

/**
 * Add tracking information
 */
router.put('/:id/tracking', requireAuth, requireEditor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { tracking_number, shipping_method } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    const updated = await prisma.orders.update({
      where: { id: orderId },
      data: {
        tracking_number,
        shipping_method: shipping_method || undefined,
        shipped_at: new Date(),
        status: 'shipped'
      }
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('Add tracking error:', err);
    res.status(500).json({ error: 'Failed to add tracking' });
  }
});

export default router;
