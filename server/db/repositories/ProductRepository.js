import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class ProductRepository extends BaseRepository {
  constructor() {
    super('products');
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku) {
    const results = await query(
      `SELECT p.* FROM \`products\` p WHERE p.sku = ?`,
      [sku]
    );
    return results[0] || null;
  }

  /**
   * List products with filters
   */
  async listWithContent(filters = {}, limit = 50, offset = 0) {
    const { status, search, sku } = filters;

    let sql = `
      SELECT p.*,
             c.title as content_title,
             COALESCE(c.data, '{}') as content_data
      FROM \`products\` p
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
      params.push(`%${search}%`);
    }

    if (sku) {
      sql += ' AND p.sku = ?';
      params.push(sku);
    }

    sql += ` ORDER BY p.updated_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Get product count with filters
   */
  async countWithFilters(filters = {}) {
    const { status, search, sku } = filters;

    let sql = `SELECT COUNT(*) as count FROM \`products\` p WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND p.sku LIKE ?';
      params.push(`%${search}%`);
    }

    if (sku) {
      sql += ' AND p.sku = ?';
      params.push(sku);
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Get active products by category/limit
   */
  async getActive(limit = 10) {
    return await query(
      `SELECT p.* FROM \`products\` p
       WHERE p.status = 'active'
       ORDER BY p.updated_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get products by IDs
   */
  async getByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(',');
    return await query(
      `SELECT p.* FROM \`products\` p WHERE p.id IN (${placeholders})`,
      ids
    );
  }

  /**
   * Check if SKU exists (excluding given ID)
   */
  async skuExists(sku, excludeId = null) {
    let sql = `SELECT COUNT(*) as count FROM \`products\` WHERE sku = ?`;
    const params = [sku];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await query(sql, params);
    return result[0]?.count > 0;
  }

  /**
   * Get product with inventory
   */
  async getWithVariants(productId) {
    const product = await this.findById(productId);
    if (!product) return null;

    const variants = await query(
      `SELECT * FROM \`product_variants\`
       WHERE product_id = ?
       ORDER BY position ASC`,
      [productId]
    );

    return { ...product, variants };
  }

  /**
   * Adjust inventory
   */
  async adjustInventory(productId, quantity) {
    await query(
      `UPDATE \`products\`
       SET inventory_quantity = inventory_quantity + ?
       WHERE id = ?`,
      [quantity, productId]
    );

    return this.findById(productId);
  }
}

export default ProductRepository;
