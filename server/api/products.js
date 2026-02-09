import { Router } from 'express';
import slugify from 'slugify';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import registry from '../services/extensionRegistry.js';

const router = Router();

/**
 * Helper: Get product with variants and content
 */
async function getProductWithVariants(productId) {
  const products = await query(
    `SELECT p.*,
            c.title as content_title,
            COALESCE(c.data, '{}') as content_data
     FROM products p
     LEFT JOIN content c ON p.content_id = c.id
     WHERE p.id = ?`,
    [productId]
  );

  if (!products[0]) {
    return null;
  }

  const product = products[0];

  // Parse content JSON
  try {
    product.content = JSON.parse(product.content_data || '{}');
  } catch (e) {
    product.content = {};
  }
  delete product.content_data;

  // Get title from content table
  product.title = product.content_title || 'Untitled';
  delete product.content_title;

  // Get variants
  const variants = await query(
    'SELECT * FROM product_variants WHERE product_id = ? ORDER BY position ASC',
    [productId]
  );

  product.variants = variants;
  return product;
}


/**
 * List products
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, sku, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    let sql = `
      SELECT p.*,
             c.title as content_title,
             COALESCE(c.data, '{}') as content_data
      FROM products p
      LEFT JOIN content c ON p.content_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND p.sku LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
    }

    if (sku) {
      sql += ' AND p.sku = ?';
      params.push(sku);
    }

    sql += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, pageOffset);

    const products = await query(sql, params);

    // Parse content JSON for each product
    products.forEach(product => {
      try {
        product.content = JSON.parse(product.content_data || '{}');
      } catch (e) {
        product.content = {};
      }
      delete product.content_data;

      // Get title from content table
      product.title = product.content_title || 'Untitled';
      delete product.content_title;
    });

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM products p WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND p.status = ?';
      countParams.push(status);
    }
    if (search) {
      countSql += ' AND p.sku LIKE ?';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm);
    }
    if (sku) {
      countSql += ' AND p.sku = ?';
      countParams.push(sku);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.count || 0;

    res.json({
      data: products,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

/**
 * Get single product with variants
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const product = await getProductWithVariants(parseInt(req.params.id));

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

/**
 * Create product
 */
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const {
      template_id,
      title,
      slug,
      content,
      meta_title,
      meta_description,
      og_image,
      canonical_url,
      sku,
      price,
      compare_at_price,
      cost,
      inventory_quantity,
      inventory_tracking,
      allow_backorder,
      weight,
      weight_unit,
      requires_shipping,
      taxable,
      status,
      variants
    } = req.body;

    // Validate required fields
    if (!template_id || !title || !sku || price === undefined) {
      return res.status(400).json({
        error: 'Template, title, SKU, and price are required'
      });
    }

    // Check SKU uniqueness
    const existing = await query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `SKU "${sku}" already exists` });
    }

    // Generate slug if not provided
    let productSlug = slug || slugify(title, { lower: true, strict: true });

    // Prepend /products/ if not already present (keeps slug globally unique)
    if (!productSlug.startsWith('/products/')) {
      productSlug = productSlug.replace(/^\/+/, '');
      productSlug = '/products/' + productSlug;
    }

    // Create content record for product
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      ['products', title, productSlug, JSON.stringify(content || {})]
    );
    const contentId = contentResult.insertId;

    // Create product
    const result = await query(
      `INSERT INTO products (
        template_id, content_id, sku, price, compare_at_price, cost, inventory_quantity,
        inventory_tracking, allow_backorder, weight, weight_unit,
        requires_shipping, taxable, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template_id,
        contentId,
        sku,
        price,
        compare_at_price || null,
        cost || null,
        inventory_quantity || 0,
        inventory_tracking !== false,
        allow_backorder || false,
        weight || null,
        weight_unit || 'lb',
        requires_shipping !== false,
        taxable !== false,
        status || 'draft'
      ]
    );

    const productId = result.insertId;

    // Create variants if provided
    if (variants && variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        await query(
          `INSERT INTO product_variants (
            product_id, title, sku, price, compare_at_price,
            inventory_quantity, option1_name, option1_value,
            option2_name, option2_value, option3_name, option3_value,
            image, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            v.title || '',
            v.sku || null,
            v.price !== undefined ? v.price : null,
            v.compare_at_price || null,
            v.inventory_quantity || 0,
            v.option1_name || null,
            v.option1_value || null,
            v.option2_name || null,
            v.option2_value || null,
            v.option3_name || null,
            v.option3_value || null,
            v.image || null,
            i
          ]
        );
      }
    }

    const product = await getProductWithVariants(productId);

    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * Update product
 */
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const {
      template_id,
      title,
      slug,
      content,
      meta_title,
      meta_description,
      og_image,
      canonical_url,
      sku,
      price,
      compare_at_price,
      cost,
      inventory_quantity,
      inventory_tracking,
      allow_backorder,
      weight,
      weight_unit,
      requires_shipping,
      taxable,
      status,
      variants
    } = req.body;

    // Get existing product
    const existing = await query('SELECT content_id FROM products WHERE id = ?', [productId]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Handle content update
    let contentIdToSet = existing[0].content_id;

    if (content !== undefined || title !== undefined || slug !== undefined) {
      // Get existing content data
      let contentData = {};
      if (contentIdToSet) {
        const contentRows = await query('SELECT data FROM content WHERE id = ?', [contentIdToSet]);
        if (contentRows[0]) {
          try {
            contentData = JSON.parse(contentRows[0].data || '{}');
          } catch (e) {
            contentData = {};
          }
        }
      }

      // Merge content updates
      if (content !== undefined) {
        contentData = { ...contentData, ...content };
      }

      // Update content table
      const contentUpdates = [];
      const contentParams = [];

      if (title !== undefined) {
        contentUpdates.push('title = ?');
        contentParams.push(title);
      }
      if (slug !== undefined) {
        let productSlug = slug;
        // Prepend /products/ if not already present
        if (!productSlug.startsWith('/products/')) {
          productSlug = productSlug.replace(/^\/+/, '');
          productSlug = '/products/' + productSlug;
        }
        contentUpdates.push('slug = ?');
        contentParams.push(productSlug);
      }
      if (content !== undefined) {
        contentUpdates.push('data = ?');
        contentParams.push(JSON.stringify(contentData));
      }

      if (contentIdToSet && contentUpdates.length > 0) {
        contentParams.push(contentIdToSet);
        await query(`UPDATE content SET ${contentUpdates.join(', ')} WHERE id = ?`, contentParams);
      } else if (!contentIdToSet && Object.keys(contentData).length > 0) {
        // Generate slug if not provided
        let productSlug = slug || slugify(title || 'product', { lower: true, strict: true });
        if (!productSlug.startsWith('/products/')) {
          productSlug = productSlug.replace(/^\/+/, '');
          productSlug = '/products/' + productSlug;
        }
        const contentResult = await query(
          'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
          ['products', title || null, productSlug, JSON.stringify(contentData)]
        );
        contentIdToSet = contentResult.insertId;
      }
    }

    // Update product
    const updates = [];
    const params = [];

    if (template_id !== undefined) {
      updates.push('template_id = ?');
      params.push(template_id);
    }

    if (sku !== undefined) {
      // Check SKU uniqueness (excluding current product)
      const existing = await query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, productId]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `SKU "${sku}" already exists` });
      }
      updates.push('sku = ?');
      params.push(sku);
    }

    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (compare_at_price !== undefined) {
      updates.push('compare_at_price = ?');
      params.push(compare_at_price);
    }
    if (cost !== undefined) {
      updates.push('cost = ?');
      params.push(cost);
    }
    if (inventory_quantity !== undefined) {
      updates.push('inventory_quantity = ?');
      params.push(inventory_quantity);
    }
    if (inventory_tracking !== undefined) {
      updates.push('inventory_tracking = ?');
      params.push(inventory_tracking);
    }
    if (allow_backorder !== undefined) {
      updates.push('allow_backorder = ?');
      params.push(allow_backorder);
    }
    if (weight !== undefined) {
      updates.push('weight = ?');
      params.push(weight);
    }
    if (weight_unit !== undefined) {
      updates.push('weight_unit = ?');
      params.push(weight_unit);
    }
    if (requires_shipping !== undefined) {
      updates.push('requires_shipping = ?');
      params.push(requires_shipping);
    }
    if (taxable !== undefined) {
      updates.push('taxable = ?');
      params.push(taxable);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (content !== undefined) {
      updates.push('content_id = ?');
      params.push(contentIdToSet || null);
    }

    if (updates.length > 0) {
      params.push(productId);
      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      await query(sql, params);
    }

    // Handle variants
    if (variants !== undefined) {
      // Get existing variants
      const existingVariants = await query(
        'SELECT id FROM product_variants WHERE product_id = ?',
        [productId]
      );
      const existingIds = new Set(existingVariants.map(v => v.id));
      const newIds = new Set(variants.filter(v => v.id).map(v => v.id));

      // Delete removed variants
      for (const variant of existingVariants) {
        if (!newIds.has(variant.id)) {
          await query('DELETE FROM product_variants WHERE id = ?', [variant.id]);
        }
      }

      // Create or update variants
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];

        if (v.id && existingIds.has(v.id)) {
          // Update existing variant
          await query(
            `UPDATE product_variants SET
              title = ?, sku = ?, price = ?, compare_at_price = ?,
              inventory_quantity = ?, option1_name = ?, option1_value = ?,
              option2_name = ?, option2_value = ?, option3_name = ?,
              option3_value = ?, image = ?, position = ?
              WHERE id = ?`,
            [
              v.title || '',
              v.sku || null,
              v.price !== undefined ? v.price : null,
              v.compare_at_price || null,
              v.inventory_quantity || 0,
              v.option1_name || null,
              v.option1_value || null,
              v.option2_name || null,
              v.option2_value || null,
              v.option3_name || null,
              v.option3_value || null,
              v.image || null,
              i,
              v.id
            ]
          );
        } else {
          // Create new variant
          await query(
            `INSERT INTO product_variants (
              product_id, title, sku, price, compare_at_price,
              inventory_quantity, option1_name, option1_value,
              option2_name, option2_value, option3_name, option3_value,
              image, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              v.title || '',
              v.sku || null,
              v.price !== undefined ? v.price : null,
              v.compare_at_price || null,
              v.inventory_quantity || 0,
              v.option1_name || null,
              v.option1_value || null,
              v.option2_name || null,
              v.option2_value || null,
              v.option3_name || null,
              v.option3_value || null,
              v.image || null,
              i
            ]
          );
        }
      }
    }

    const product = await getProductWithVariants(productId);

    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * Delete product
 */
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const existing = await query('SELECT id FROM products WHERE id = ?', [productId]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product (cascade deletes variants and content)
    await query('DELETE FROM products WHERE id = ?', [productId]);

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * Adjust inventory
 */
router.post('/:id/inventory', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { quantity, adjustment } = req.body;

    if (quantity === undefined && adjustment === undefined) {
      return res.status(400).json({
        error: 'Either quantity or adjustment is required'
      });
    }

    let sql;
    const params = [];

    if (quantity !== undefined) {
      sql = 'UPDATE products SET inventory_quantity = ? WHERE id = ?';
      params.push(quantity, productId);
    } else {
      sql = 'UPDATE products SET inventory_quantity = inventory_quantity + ? WHERE id = ?';
      params.push(adjustment, productId);
    }

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await getProductWithVariants(productId);
    res.json(product);
  } catch (err) {
    console.error('Adjust inventory error:', err);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

export default router;
