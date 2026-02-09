import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber) {
    const results = await query(
      `SELECT o.* FROM \`orders\` o WHERE o.order_number = ?`,
      [orderNumber]
    );
    return results[0] || null;
  }

  /**
   * List orders with filters
   */
  async listWithFilters(filters = {}, limit = 50, offset = 0) {
    const { status, payment_status, search } = filters;

    let sql = `
      SELECT o.*, c.email as customer_email
      FROM \`orders\` o
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

    sql += ` ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Count orders with filters
   */
  async countWithFilters(filters = {}) {
    const { status, payment_status, search } = filters;

    let sql = `SELECT COUNT(*) as count FROM \`orders\` o WHERE 1=1`;
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

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Get order with items
   */
  async getWithItems(orderId) {
    const order = await this.findById(orderId);
    if (!order) return null;

    const items = await query(
      `SELECT * FROM \`order_items\` WHERE order_id = ?`,
      [orderId]
    );

    // Parse JSON fields
    if (order.billing_address) {
      try {
        order.billing_address = JSON.parse(order.billing_address);
      } catch (e) {
        order.billing_address = {};
      }
    }
    if (order.shipping_address) {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        order.shipping_address = {};
      }
    }

    return { ...order, items };
  }

  /**
   * Generate next order number
   */
  async generateOrderNumber() {
    const results = await query(
      `SELECT order_number FROM \`orders\` ORDER BY id DESC LIMIT 1`
    );

    let nextNumber = 1001;
    if (results.length > 0) {
      const lastNumber = parseInt(results[0].order_number.replace('#', ''));
      nextNumber = lastNumber + 1;
    }

    return `#${nextNumber}`;
  }

  /**
   * Create order items from cart
   */
  async createOrderItems(orderId, cartItems) {
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
        `INSERT INTO \`order_items\` (
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
   * Deduct inventory from products and variants
   */
  async deductInventory(cartItems) {
    for (const item of cartItems) {
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
  }

  /**
   * Get customer's orders
   */
  async getCustomerOrders(customerId, limit = 50, offset = 0) {
    return await query(
      `SELECT o.* FROM \`orders\` o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [customerId]
    );
  }

  /**
   * Update order status
   */
  async updateStatus(orderId, status) {
    await query(
      `UPDATE \`orders\` SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, orderId]
    );
    return this.findById(orderId);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId, paymentStatus) {
    await query(
      `UPDATE \`orders\` SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [paymentStatus, orderId]
    );
    return this.findById(orderId);
  }

  /**
   * Add tracking number
   */
  async addTracking(orderId, trackingNumber, shippingMethod = null) {
    await query(
      `UPDATE \`orders\`
       SET tracking_number = ?, shipped_at = CURRENT_TIMESTAMP,
           shipping_method = COALESCE(?, shipping_method),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [trackingNumber, shippingMethod, orderId]
    );
    return this.findById(orderId);
  }

  /**
   * Get recent orders
   */
  async getRecent(limit = 10) {
    return await query(
      `SELECT o.* FROM \`orders\` o
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get orders by status
   */
  async getByStatus(status, limit = 50) {
    return await query(
      `SELECT o.* FROM \`orders\` o
       WHERE o.status = ?
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [status, limit]
    );
  }
}

export default OrderRepository;
