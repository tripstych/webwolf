import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers');
  }

  /**
   * Find customer by email
   */
  async findByEmail(email) {
    const results = await query(
      `SELECT c.* FROM customers c WHERE c.email = ?`,
      [email]
    );
    return results[0] || null;
  }

  /**
   * List customers with search
   */
  async listWithSearch(search = '', limit = 50, offset = 0) {
    let sql = `SELECT c.* FROM customers c WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Count customers with search
   */
  async countWithSearch(search = '') {
    let sql = `SELECT COUNT(*) as count FROM customers c WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Get customer with addresses
   */
  async getWithAddresses(customerId) {
    const customer = await this.findById(customerId);
    if (!customer) return null;

    const addresses = await query(
      `SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC`,
      [customerId]
    );

    return { ...customer, addresses };
  }

  /**
   * Get customer with orders
   */
  async getWithOrders(customerId) {
    const customer = await this.findById(customerId);
    if (!customer) return null;

    const orders = await query(
      `SELECT * FROM \`orders\` WHERE customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );

    return { ...customer, orders };
  }

  /**
   * Get customer stats
   */
  async getStats(customerId) {
    const stats = await query(
      `SELECT
        COUNT(o.id) as total_orders,
        COUNT(DISTINCT DATE(o.created_at)) as days_active,
        COALESCE(SUM(o.total), 0) as lifetime_value,
        MAX(o.created_at) as last_order_date
       FROM customers c
       LEFT JOIN \`orders\` o ON c.id = o.customer_id
       WHERE c.id = ?`,
      [customerId]
    );

    return stats[0] || {};
  }

  /**
   * Get customer's default shipping address
   */
  async getDefaultShippingAddress(customerId) {
    const results = await query(
      `SELECT * FROM addresses
       WHERE customer_id = ? AND type = 'shipping' AND is_default = 1
       LIMIT 1`,
      [customerId]
    );
    return results[0] || null;
  }

  /**
   * Get top customers by spend
   */
  async getTopBySpend(limit = 10) {
    return await query(
      `SELECT c.*, SUM(o.total) as total_spent, COUNT(o.id) as order_count
       FROM customers c
       LEFT JOIN \`orders\` o ON c.id = o.customer_id
       GROUP BY c.id
       ORDER BY total_spent DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get customers who ordered in date range
   */
  async getByOrderDateRange(startDate, endDate, limit = 50) {
    return await query(
      `SELECT DISTINCT c.* FROM customers c
       JOIN \`orders\` o ON c.id = o.customer_id
       WHERE o.created_at BETWEEN ? AND ?
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );
  }
}

export default CustomerRepository;
