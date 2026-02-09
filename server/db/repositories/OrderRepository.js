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

    return { ...order, items };
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
