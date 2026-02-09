import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class TemplateRepository extends BaseRepository {
  constructor() {
    super('templates');
  }

  /**
   * Find template by filename
   */
  async findByFilename(filename) {
    const results = await query(
      `SELECT t.* FROM templates t WHERE t.filename = ?`,
      [filename]
    );
    return results[0] || null;
  }

  /**
   * List page templates (excluding blocks)
   */
  async listPageTemplates(filters = {}, limit = 50, offset = 0) {
    const { content_type } = filters;

    let sql = `
      SELECT t.*, COUNT(p.id) as page_count
      FROM templates t
      LEFT JOIN pages p ON t.id = p.template_id
      WHERE t.filename NOT LIKE 'blocks/%'
    `;
    const params = [];

    if (content_type) {
      sql += ' AND t.content_type = ?';
      params.push(content_type);
    }

    sql += ` GROUP BY t.id ORDER BY t.name LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Count page templates with filters
   */
  async countPageTemplates(filters = {}) {
    const { content_type } = filters;

    let sql = `SELECT COUNT(DISTINCT t.id) as count FROM templates t
               WHERE t.filename NOT LIKE 'blocks/%'`;
    const params = [];

    if (content_type) {
      sql += ' AND t.content_type = ?';
      params.push(content_type);
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * List block templates
   */
  async listBlockTemplates(limit = 50, offset = 0) {
    return await query(
      `SELECT t.*, COUNT(b.id) as block_count
       FROM templates t
       LEFT JOIN blocks b ON t.id = b.template_id
       WHERE t.content_type = 'blocks'
       GROUP BY t.id
       ORDER BY t.name
       LIMIT ${limit} OFFSET ${offset}`
    );
  }

  /**
   * Count block templates
   */
  async countBlockTemplates() {
    const result = await query(
      `SELECT COUNT(*) as count FROM templates WHERE content_type = 'blocks'`
    );
    return result[0]?.count || 0;
  }

  /**
   * Get templates by content type
   */
  async getByContentType(contentType, limit = 50, offset = 0) {
    return await query(
      `SELECT t.*, COUNT(p.id) as page_count
       FROM templates t
       LEFT JOIN pages p ON t.id = p.template_id
       WHERE t.content_type = ?
       GROUP BY t.id
       ORDER BY t.name
       LIMIT ${limit} OFFSET ${offset}`,
      [contentType]
    );
  }

  /**
   * Count templates by content type
   */
  async countByContentType(contentType) {
    const result = await query(
      `SELECT COUNT(*) as count FROM templates WHERE content_type = ?`,
      [contentType]
    );
    return result[0]?.count || 0;
  }

  /**
   * Get template with usage counts
   */
  async getWithCounts(templateId) {
    const results = await query(
      `SELECT t.*,
              COUNT(DISTINCT p.id) as page_count,
              COUNT(DISTINCT b.id) as block_count
       FROM templates t
       LEFT JOIN pages p ON t.id = p.template_id
       LEFT JOIN blocks b ON t.id = b.template_id
       WHERE t.id = ?
       GROUP BY t.id`,
      [templateId]
    );
    return results[0] || null;
  }

  /**
   * Check if template is in use
   */
  async isInUse(templateId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM pages WHERE template_id = ? UNION ALL
       SELECT COUNT(*) as count FROM blocks WHERE template_id = ?`,
      [templateId, templateId]
    );
    // Sum counts from both queries
    const total = (result[0]?.count || 0) + (result[1]?.count || 0);
    return total > 0;
  }

  /**
   * Count pages using template
   */
  async countPageUsage(templateId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM pages WHERE template_id = ?`,
      [templateId]
    );
    return result[0]?.count || 0;
  }

  /**
   * Count blocks using template
   */
  async countBlockUsage(templateId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM blocks WHERE template_id = ?`,
      [templateId]
    );
    return result[0]?.count || 0;
  }

  /**
   * Update template metadata
   */
  async updateMetadata(templateId, updates) {
    const { name, description, regions } = updates;

    const updateClauses = [];
    const params = [];

    if (name !== undefined) {
      updateClauses.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateClauses.push('description = ?');
      params.push(description);
    }
    if (regions !== undefined) {
      updateClauses.push('regions = ?');
      params.push(JSON.stringify(regions));
    }

    if (updateClauses.length === 0) {
      return null;
    }

    updateClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(templateId);

    await query(
      `UPDATE templates SET ${updateClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(templateId);
  }

  /**
   * List templates with parsed regions
   */
  async listWithParsedRegions(filters = {}, limit = 50, offset = 0) {
    const templates = await this.listPageTemplates(filters, limit, offset);

    return templates.map(template => ({
      ...template,
      regions: this._parseRegions(template.regions)
    }));
  }

  /**
   * Get template with parsed regions
   */
  async getWithParsedRegions(templateId) {
    const template = await this.getWithCounts(templateId);
    if (!template) return null;

    return {
      ...template,
      regions: this._parseRegions(template.regions)
    };
  }

  /**
   * Helper: Parse regions JSON
   */
  _parseRegions(regionsJson) {
    if (!regionsJson) return [];
    try {
      return typeof regionsJson === 'string'
        ? JSON.parse(regionsJson)
        : regionsJson;
    } catch (e) {
      return [];
    }
  }
}

export default TemplateRepository;
