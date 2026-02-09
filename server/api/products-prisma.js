import { Router } from 'express';
import slugify from 'slugify';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// List all products
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, sku, limit = 50, offset = 0 } = req.query;

    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (sku) where.sku = sku;
    if (search) {
      where.OR = [
        { content: { title: { contains: search } } },
        { sku: { contains: search } }
      ];
    }

    const products = await prisma.products.findMany({
      where,
      include: {
        content: true,
        product_variants: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' },
      take: pageLimit,
      skip: pageOffset
    });

    const total = await prisma.products.count({ where });

    // Transform response
    const transformed = products.map(p => ({
      ...p,
      title: p.content?.title || 'Untitled',
      content: p.content?.data ? JSON.parse(p.content.data) : {},
      variants: p.product_variants
    }));

    res.json({
      data: transformed,
      pagination: { total, limit: pageLimit, offset: pageOffset }
    });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Get single product with variants
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        content: true,
        product_variants: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      ...product,
      title: product.content?.title || 'Untitled',
      content: product.content?.data ? JSON.parse(product.content.data) : {},
      variants: product.product_variants
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const {
      template_id,
      title,
      slug: providedSlug,
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

    // Check SKU uniqueness
    const existingSku = await prisma.products.findUnique({
      where: { sku }
    });
    if (existingSku) {
      return res.status(400).json({ error: `SKU "${sku}" already exists` });
    }

    // Generate slug
    let productSlug = providedSlug || slugify(title, { lower: true, strict: true });
    if (!productSlug.startsWith('/products/')) {
      productSlug = productSlug.replace(/^\/+/, '');
      productSlug = '/products/' + productSlug;
    }

    // Create content record first
    const contentRecord = await prisma.content.create({
      data: {
        module: 'products',
        title,
        slug: productSlug,
        data: JSON.stringify(content || {})
      }
    });

    // Create product with variants in transaction
    const product = await prisma.products.create({
      data: {
        template_id,
        content_id: contentRecord.id,
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
        status: status || 'draft',
        product_variants: {
          createMany: {
            data: (variants || []).map((v, i) => ({
              title: v.title || '',
              sku: v.sku || null,
              price: v.price !== undefined ? v.price : null,
              compare_at_price: v.compare_at_price || null,
              inventory_quantity: v.inventory_quantity || 0,
              option1_name: v.option1_name || null,
              option1_value: v.option1_value || null,
              option2_name: v.option2_name || null,
              option2_value: v.option2_value || null,
              option3_name: v.option3_name || null,
              option3_value: v.option3_value || null,
              image: v.image || null,
              position: i
            }))
          }
        }
      },
      include: {
        content: true,
        product_variants: true
      }
    });

    res.status(201).json({
      ...product,
      title: product.content?.title || 'Untitled',
      content: product.content?.data ? JSON.parse(product.content.data) : {},
      variants: product.product_variants
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const {
      template_id,
      title,
      slug: providedSlug,
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
    const existing = await prisma.products.findUnique({
      where: { id: productId },
      include: { content: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check SKU uniqueness (excluding current product)
    if (sku && sku !== existing.sku) {
      const duplicate = await prisma.products.findUnique({
        where: { sku }
      });
      if (duplicate) {
        return res.status(400).json({ error: `SKU "${sku}" already exists` });
      }
    }

    // Prepare product updates
    const productUpdates = {};
    if (template_id !== undefined) productUpdates.template_id = template_id;
    if (sku !== undefined) productUpdates.sku = sku;
    if (price !== undefined) productUpdates.price = price;
    if (compare_at_price !== undefined) productUpdates.compare_at_price = compare_at_price;
    if (cost !== undefined) productUpdates.cost = cost;
    if (inventory_quantity !== undefined) productUpdates.inventory_quantity = inventory_quantity;
    if (inventory_tracking !== undefined) productUpdates.inventory_tracking = inventory_tracking;
    if (allow_backorder !== undefined) productUpdates.allow_backorder = allow_backorder;
    if (weight !== undefined) productUpdates.weight = weight;
    if (weight_unit !== undefined) productUpdates.weight_unit = weight_unit;
    if (requires_shipping !== undefined) productUpdates.requires_shipping = requires_shipping;
    if (taxable !== undefined) productUpdates.taxable = taxable;
    if (status !== undefined) productUpdates.status = status;

    // Update content if provided
    if (existing.content_id && (content !== undefined || title !== undefined || providedSlug !== undefined)) {
      let contentData = {};
      if (existing.content?.data) {
        try {
          contentData = JSON.parse(existing.content.data);
        } catch (e) {
          contentData = {};
        }
      }

      const contentUpdates = {};
      if (title !== undefined) contentUpdates.title = title;
      if (providedSlug !== undefined) {
        let slug = providedSlug;
        if (!slug.startsWith('/products/')) {
          slug = slug.replace(/^\/+/, '');
          slug = '/products/' + slug;
        }
        contentUpdates.slug = slug;
      }
      if (content !== undefined) {
        contentData = { ...contentData, ...content };
        contentUpdates.data = JSON.stringify(contentData);
      }

      if (Object.keys(contentUpdates).length > 0) {
        await prisma.content.update({
          where: { id: existing.content_id },
          data: contentUpdates
        });
      }
    }

    // Update product
    const updated = await prisma.products.update({
      where: { id: productId },
      data: productUpdates,
      include: {
        content: true,
        product_variants: true
      }
    });

    // Handle variants update
    if (variants !== undefined) {
      // Get IDs of incoming variants
      const incomingIds = new Set(variants.filter(v => v.id).map(v => v.id));

      // Delete variants not in incoming list
      await prisma.product_variants.deleteMany({
        where: {
          product_id: productId,
          id: { notIn: Array.from(incomingIds) }
        }
      });

      // Update or create variants
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (v.id) {
          // Update existing
          await prisma.product_variants.update({
            where: { id: v.id },
            data: {
              title: v.title || '',
              sku: v.sku || null,
              price: v.price !== undefined ? v.price : null,
              compare_at_price: v.compare_at_price || null,
              inventory_quantity: v.inventory_quantity || 0,
              option1_name: v.option1_name || null,
              option1_value: v.option1_value || null,
              option2_name: v.option2_name || null,
              option2_value: v.option2_value || null,
              option3_name: v.option3_name || null,
              option3_value: v.option3_value || null,
              image: v.image || null,
              position: i
            }
          });
        } else {
          // Create new
          await prisma.product_variants.create({
            data: {
              product_id: productId,
              title: v.title || '',
              sku: v.sku || null,
              price: v.price !== undefined ? v.price : null,
              compare_at_price: v.compare_at_price || null,
              inventory_quantity: v.inventory_quantity || 0,
              option1_name: v.option1_name || null,
              option1_value: v.option1_value || null,
              option2_name: v.option2_name || null,
              option2_value: v.option2_value || null,
              option3_name: v.option3_name || null,
              option3_value: v.option3_value || null,
              image: v.image || null,
              position: i
            }
          });
        }
      }
    }

    // Fetch updated product with relations
    const finalProduct = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        content: true,
        product_variants: {
          orderBy: { position: 'asc' }
        }
      }
    });

    res.json({
      ...finalProduct,
      title: finalProduct.content?.title || 'Untitled',
      content: finalProduct.content?.data ? JSON.parse(finalProduct.content.data) : {},
      variants: finalProduct.product_variants
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product (cascade will delete variants)
    await prisma.products.delete({
      where: { id: productId }
    });

    // Delete orphaned content
    if (product.content_id) {
      await prisma.content.deleteMany({
        where: { id: product.content_id }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Adjust inventory
router.post('/:id/inventory', requireAuth, requireEditor, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { adjustment, variant_id } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({ error: 'Adjustment value required' });
    }

    // If variant_id provided, adjust variant inventory
    if (variant_id) {
      const variant = await prisma.product_variants.findUnique({
        where: { id: parseInt(variant_id) }
      });

      if (!variant) {
        return res.status(404).json({ error: 'Variant not found' });
      }

      const updated = await prisma.product_variants.update({
        where: { id: parseInt(variant_id) },
        data: {
          inventory_quantity: Math.max(0, (variant.inventory_quantity || 0) + adjustment)
        }
      });

      return res.json(updated);
    }

    // Otherwise adjust product inventory
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = await prisma.products.update({
      where: { id: productId },
      data: {
        inventory_quantity: Math.max(0, (product.inventory_quantity || 0) + adjustment)
      }
    });

    res.json(updated);
  } catch (err) {
    console.error('Adjust inventory error:', err);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

export default router;
