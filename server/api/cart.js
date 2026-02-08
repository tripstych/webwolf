import { Router } from 'express';
import { query } from '../db/connection.js';

const router = Router();

/**
 * Helper: Calculate cart totals
 */
async function calculateTotals(items, shippingAddress) {
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;

  // Calculate subtotal
  for (const item of items) {
    subtotal += (item.price || 0) * (item.quantity || 0);
  }

  // Get tax rate from settings
  const settings = await query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    ['tax_rate']
  );
  const taxRate = settings.length > 0 ? parseFloat(settings[0].setting_value) || 0 : 0;
  tax = subtotal * taxRate;

  // Get shipping rate from settings (simplified - flat rate)
  const shippingSettings = await query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    ['shipping_flat_rate']
  );
  shipping = shippingSettings.length > 0 ? parseFloat(shippingSettings[0].setting_value) || 0 : 0;

  // For shipping addresses in certain zones, shipping might be different (simplified)
  if (shippingAddress && shippingAddress.country && shippingAddress.country !== 'US') {
    shipping += 5; // Add extra for international
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat((subtotal + tax + shipping).toFixed(2))
  };
}

/**
 * Get current cart from session
 */
router.get('/', (req, res) => {
  try {
    const cart = req.session.cart || {
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      }
    };

    res.json(cart);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

/**
 * Add item to cart
 */
router.post('/items', async (req, res) => {
  try {
    const { productId, variantId, quantity, price } = req.body;

    if (!productId || !quantity || !price) {
      return res.status(400).json({
        error: 'Product ID, quantity, and price are required'
      });
    }

    // Validate product exists
    const product = await query(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!product[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Initialize cart if needed
    if (!req.session.cart) {
      req.session.cart = { items: [], totals: {} };
    }

    // Check if item already in cart
    const existingItem = req.session.cart.items.find(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingItem) {
      // Update quantity
      existingItem.quantity += parseInt(quantity);
    } else {
      // Add new item
      req.session.cart.items.push({
        productId,
        variantId,
        quantity: parseInt(quantity),
        price: parseFloat(price)
      });
    }

    // Recalculate totals
    req.session.cart.totals = await calculateTotals(req.session.cart.items);

    res.json(req.session.cart);
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

/**
 * Update item quantity in cart
 */
router.put('/items/:itemIndex', (req, res) => {
  try {
    const itemIndex = parseInt(req.params.itemIndex);
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    if (!req.session.cart || !req.session.cart.items[itemIndex]) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      req.session.cart.items.splice(itemIndex, 1);
    } else {
      req.session.cart.items[itemIndex].quantity = parseInt(quantity);
    }

    res.json(req.session.cart);
  } catch (err) {
    console.error('Update cart item error:', err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

/**
 * Remove item from cart
 */
router.delete('/items/:itemIndex', (req, res) => {
  try {
    const itemIndex = parseInt(req.params.itemIndex);

    if (!req.session.cart || !req.session.cart.items[itemIndex]) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    req.session.cart.items.splice(itemIndex, 1);

    res.json(req.session.cart);
  } catch (err) {
    console.error('Remove cart item error:', err);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

/**
 * Clear entire cart
 */
router.post('/clear', (req, res) => {
  try {
    req.session.cart = {
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      }
    };

    res.json(req.session.cart);
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

/**
 * Calculate cart totals with shipping address
 */
router.post('/totals', async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const totals = await calculateTotals(items, shippingAddress);

    res.json(totals);
  } catch (err) {
    console.error('Calculate totals error:', err);
    res.status(500).json({ error: 'Failed to calculate totals' });
  }
});

export default router;
