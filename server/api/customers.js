import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { CustomerRepository } from '../db/repositories/CustomerRepository.js';

const router = Router();
const customerRepo = new CustomerRepository();

/**
 * List all customers (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const customers = await customerRepo.listWithSearch(search, pageLimit, pageOffset);
    const total = await customerRepo.countWithSearch(search);

    res.json({
      data: customers,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
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
    const customer = await customerRepo.getWithOrders(parseInt(req.params.id));

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

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
