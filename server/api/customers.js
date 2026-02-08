import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * List all customers (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT DISTINCT c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (
        c.email LIKE ? OR
        c.first_name LIKE ? OR
        c.last_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const customers = await query(sql, params);

    res.json(customers);
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

/**
 * Get customer by ID with orders (admin only)
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const customers = await query(
      'SELECT id, email, first_name, last_name, phone, email_verified, created_at FROM customers WHERE id = ?',
      [id]
    );

    if (!customers[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customers[0];

    // Get customer's orders
    const orders = await query(
      'SELECT id, order_number, total, payment_status, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
      [id]
    );

    customer.orders = orders;

    res.json(customer);
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

/**
 * Get customer statistics (admin only)
 */
router.get('/stats/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await query('SELECT COUNT(*) as count FROM customers');

    // Customers with verified email
    const verifiedCustomers = await query(
      'SELECT COUNT(*) as count FROM customers WHERE email_verified = TRUE'
    );

    // Total orders
    const totalOrders = await query('SELECT COUNT(*) as count FROM orders');

    // Total revenue
    const totalRevenue = await query(
      'SELECT SUM(total) as revenue FROM orders WHERE payment_status = "paid"'
    );

    // Average order value
    const avgOrderValue = await query(
      'SELECT AVG(total) as avg FROM orders WHERE payment_status = "paid"'
    );

    res.json({
      totalCustomers: totalCustomers[0].count,
      verifiedCustomers: verifiedCustomers[0].count,
      totalOrders: totalOrders[0].count,
      totalRevenue: totalRevenue[0].revenue || 0,
      averageOrderValue: avgOrderValue[0].avg || 0
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
