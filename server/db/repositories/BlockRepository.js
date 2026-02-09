import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class BlockRepository extends BaseRepository {
  constructor() {
    super('blocks');
  }

  /**
   * Find block by slug
   */
  async findBySlug(slug) {
    const results = await query(
      `SELECT b.* FROM blocks b WHERE b.slug = ?`,
      [slug]
    );
    return results[0] || null;
  }

  /**
   * List blocks with content
   */
  async listWithContent(filters = {}, limit = 50, offset = 0) {
    const { content_type } = filters;

    let sql = `
      SELECT b.*, t.name as template_name, COALESCE(c.data, '{}') as content_data
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
      LEFT JOIN content c ON b.content_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (content_type) {
      sql += ' AND b.content_type = ?';
      params.push(content_type);
    }

    sql += ` ORDER BY b.name LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Count blocks with filters
   */
  async countWithFilters(filters = {}) {
    const { content_type } = filters;

    let sql = `SELECT COUNT(*) as count FROM blocks b WHERE 1=1`;
    const params = [];

    if (content_type) {
      sql += ' AND b.content_type = ?';
      params.push(content_type);
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Get block with template regions
   */
  async getWithTemplate(blockId) {
    const results = await query(
      `SELECT b.*, t.name as template_name, t.regions as template_regions,
              COALESCE(c.data, '{}') as content_data
       FROM blocks b
       LEFT JOIN templates t ON b.template_id = t.id
       LEFT JOIN content c ON b.content_id = c.id
       WHERE b.id = ?`,
      [blockId]
    );
    return results[0] || null;
  }

  /**
   * Get blocks by template type
   */
  async getByTemplateId(templateId, limit = 50) {
    return await query(
      `SELECT b.*, COALESCE(c.data, '{}') as content_data
       FROM blocks b
       LEFT JOIN content c ON b.content_id = c.id
       WHERE b.template_id = ?
       ORDER BY b.name
       LIMIT ?`,
      [templateId, limit]
    );
  }

  /**
   * Get blocks by content type
   */
  async getByContentType(contentType, limit = 50) {
    return await query(
      `SELECT b.*, t.name as template_name
       FROM blocks b
       LEFT JOIN templates t ON b.template_id = t.id
       WHERE b.content_type = ?
       ORDER BY b.name
       LIMIT ?`,
      [contentType, limit]
    );
  }

  /**
   * Create block with content
   */
  async createBlockWithContent(blockData, contentData) {
    const { template_id, name, slug, description, content_type, created_by } = blockData;

    // Create content record if content exists
    let contentId = null;
    if (contentData && Object.keys(contentData).length > 0) {
      const contentResult = await query(
        'INSERT INTO content (module, data) VALUES (?, ?)',
        [content_type || 'blocks', JSON.stringify(contentData)]
      );
      contentId = contentResult.insertId;
    }

    // Create block record
    const result = await query(
      `INSERT INTO blocks (template_id, name, slug, description, content_id, content_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [template_id, name, slug, description || null, contentId || null, content_type || 'blocks', created_by || null]
    );

    return result.insertId;
  }

  /**
   * Update block with content
   */
  async updateBlockWithContent(blockId, blockUpdates, contentUpdates) {
    const block = await this.findById(blockId);
    if (!block) return null;

    // Update content if provided
    if (Object.keys(contentUpdates).length > 0) {
      if (block.content_id) {
        // Update existing content
        await query(
          'UPDATE content SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [JSON.stringify(contentUpdates), block.content_id]
        );
      } else if (Object.keys(contentUpdates).length > 0) {
        // Create new content record
        const contentResult = await query(
          'INSERT INTO content (module, data) VALUES (?, ?)',
          [blockUpdates.content_type || 'blocks', JSON.stringify(contentUpdates)]
        );
        blockUpdates.content_id = contentResult.insertId;
      }
    }

    // Update block record
    if (Object.keys(blockUpdates).length > 0) {
      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(blockUpdates)) {
        updates.push(`${key} = ?`);
        params.push(value);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(blockId);

      await query(
        `UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getWithTemplate(blockId);
  }

  /**
   * List blocks for UI serialization
   */
  async listForUI(filters = {}, limit = 50, offset = 0) {
    const blocks = await this.listWithContent(filters, limit, offset);

    // Parse content and return clean data
    return blocks.map(block => ({
      id: block.id,
      template_id: block.template_id,
      name: block.name,
      slug: block.slug,
      description: block.description,
      content: (() => {
        try {
          return JSON.parse(block.content_data || '{}');
        } catch (e) {
          return {};
        }
      })(),
      template_name: block.template_name,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: block.created_at,
      updated_at: block.updated_at
    }));
  }

  /**
   * Get single block for UI serialization
   */
  async getForUI(blockId) {
    const block = await this.getWithTemplate(blockId);
    if (!block) return null;

    return {
      id: block.id,
      template_id: block.template_id,
      name: block.name,
      slug: block.slug,
      description: block.description,
      content: (() => {
        try {
          return JSON.parse(block.content_data || '{}');
        } catch (e) {
          return {};
        }
      })(),
      regions: (() => {
        try {
          return typeof block.template_regions === 'string'
            ? JSON.parse(block.template_regions)
            : (block.template_regions || []);
        } catch (e) {
          return [];
        }
      })(),
      template_name: block.template_name,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: block.created_at,
      updated_at: block.updated_at
    };
  }
}

export default BlockRepository;
