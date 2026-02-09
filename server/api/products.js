import { Router } from 'express';
import slugify from 'slugify';
import { ProductRepository } from '../db/repositories/ProductRepository.js';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import registry from '../services/extensionRegistry.js';

const router = Router();
const productRepo = new ProductRepository();

/**
 * Helper: Parse product content JSON
 */
function parseProductContent(product) {
  try {
    product.content = JSON.parse(product.content_data || '{}');
  } catch (e) {
    product.content = {};
  }
  delete product.content_data;

  // Get title from content table
  product.title = product.content_title || 'Untitled';
  delete product.content_title;

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

    // Get products using repository
    const products = await productRepo.listWithContent(
      { status, search, sku },
      pageLimit,
      pageOffset
    );

    // Parse content for each product
    products.forEach(parseProductContent);

    // Get total count
    const total = await productRepo.countWithFilters({ status, search, sku });

    res.json({
      data: products,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
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
    const product = await productRepo.getWithVariants(parseInt(req.params.id));

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch content data separately
    if (product.content_id) {
      const content = await query('SELECT data FROM content WHERE id = ?', [product.content_id]);
      if (content[0]) {
        try {
          product.content = JSON.parse(content[0].data || '{}');
        } catch (e) {
          product.content = {};
        }
      }
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

    // Check SKU uniqueness using repository
    if (await productRepo.skuExists(sku)) {
      return res.status(400).json({ error: `SKU "${sku}" already exists` });
    }

    // Generate slug if not provided
    let productSlug = slug || slugify(title, { lower: true, strict: true });

    // Prepend /products/ if not already present
    if (!productSlug.startsWith('/products/')) {
      productSlug = productSlug.replace(/^\/+/, '');
      productSlug = '/products/' + productSlug;
    }

    // Create content record
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      ['products', title, productSlug, JSON.stringify(content || {})]
    );
    const contentId = contentResult.insertId;

    // Create product using repository
    const productId = await productRepo.create({
      template_id,
      content_id: contentId,
      sku,
      price,
      compare_at_price: compare_at_price || null,
      cost: cost || null,
      inventory_quantity: inventory_quantity || 0,
      inventory_tracking: inventory_tracking !== false,
      allow_backorder: allow_backorder || false,
      weight: weight || null,
      weight_unit: weight_unit || 'lb',
      requires_shipping: requires_shipping !== false,
      taxable: taxable !== false,
      status: status || 'draft'
    });

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

    const product = await productRepo.getWithVariants(productId);
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
    const existing = await productRepo.findById(productId);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Handle content update
    let contentIdToSet = existing.content_id;

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

    // Build product updates
    const updates = {};

    if (template_id !== undefined) updates.template_id = template_id;

    if (sku !== undefined) {
      // Check SKU uniqueness (excluding current product)
      if (await productRepo.skuExists(sku, productId)) {
        return res.status(400).json({ error: `SKU "${sku}" already exists` });
      }
      updates.sku = sku;
    }

    if (price !== undefined) updates.price = price;
    if (compare_at_price !== undefined) updates.compare_at_price = compare_at_price;
    if (cost !== undefined) updates.cost = cost;
    if (inventory_quantity !== undefined) updates.inventory_quantity = inventory_quantity;
    if (inventory_tracking !== undefined) updates.inventory_tracking = inventory_tracking;
    if (allow_backorder !== undefined) updates.allow_backorder = allow_backorder;
    if (weight !== undefined) updates.weight = weight;
    if (weight_unit !== undefined) updates.weight_unit = weight_unit;
    if (requires_shipping !== undefined) updates.requires_shipping = requires_shipping;
    if (taxable !== undefined) updates.taxable = taxable;
    if (status !== undefined) updates.status = status;
    if (content !== undefined) updates.content_id = contentIdToSet || null;

    // Update product using repository
    if (Object.keys(updates).length > 0) {
      await productRepo.update(productId, updates);
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

    const product = await productRepo.getWithVariants(productId);
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

    const existing = await productRepo.findById(productId);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product using repository (cascade deletes variants and content)
    await productRepo.delete(productId);

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

    let product;

    if (quantity !== undefined) {
      // Set exact quantity
      product = await productRepo.update(productId, { inventory_quantity: quantity });
    } else {
      // Adjust by amount
      product = await productRepo.adjustInventory(productId, adjustment);
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productWithVariants = await productRepo.getWithVariants(productId);
    res.json(productWithVariants);
  } catch (err) {
    console.error('Adjust inventory error:', err);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

export default router;
