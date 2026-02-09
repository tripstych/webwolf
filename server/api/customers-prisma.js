import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * List customers
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { first_name: { contains: search } },
        { last_name: { contains: search } }
      ];
    }

    const customers = await prisma.customers.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            order_number: true,
            total: true,
            status: true,
            created_at: true
          }
        },
        addresses: true
      },
      orderBy: { created_at: 'desc' },
      take: pageLimit,
      skip: pageOffset
    });

    const total = await prisma.customers.count({ where });

    res.json({
      data: customers,
      pagination: { total, limit: pageLimit, offset: pageOffset }
    });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

/**
 * Get customer with orders
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    const customer = await prisma.customers.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          include: {
            order_items: {
              include: {
                products: {
                  select: {
                    id: true,
                    title: true,
                    sku: true
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        addresses: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Parse JSON fields in orders
    const transformedCustomer = {
      ...customer,
      orders: customer.orders.map(order => ({
        ...order,
        billing_address: order.billing_address ? JSON.parse(order.billing_address) : {},
        shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : {}
      }))
    };

    res.json(transformedCustomer);
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

/**
 * Get customer statistics
 */
router.get('/stats/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await prisma.customers.count();

    // Total orders
    const totalOrders = await prisma.orders.count();

    // Total revenue
    const revenueResult = await prisma.orders.aggregate({
      _sum: { total: true }
    });
    const totalRevenue = revenueResult._sum?.total || 0;

    // Average order value
    const avgResult = await prisma.orders.aggregate({
      _avg: { total: true }
    });
    const averageOrderValue = avgResult._avg?.total || 0;

    // Orders by status
    const statusBreakdown = await prisma.orders.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // Recent customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCustomers = await prisma.customers.count({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    res.json({
      total_customers: totalCustomers,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      average_order_value: parseFloat(averageOrderValue.toFixed(2)),
      recent_customers_30d: recentCustomers,
      orders_by_status: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.id
      }))
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
