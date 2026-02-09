import { BaseRepository } from './BaseRepository.js';
import { query } from '../connection.js';

export class PageRepository extends BaseRepository {
  constructor() {
    super('pages');
  }

  /**
   * Find page by slug
   */
  async findBySlug(slug) {
    const results = await query(
      `SELECT p.* FROM pages p WHERE p.slug = ?`,
      [slug]
    );
    return results[0] || null;
  }

  /**
   * List pages with filters
   */
  async listWithContent(filters = {}, limit = 50, offset = 0) {
    const { status, content_type, search } = filters;

    let sql = `
      SELECT p.*, c.title as content_title, c.data as content_data
      FROM pages p
      LEFT JOIN content c ON p.content_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (content_type) {
      sql += ' AND p.content_type = ?';
      params.push(content_type);
    }

    if (search) {
      sql += ' AND (p.title LIKE ? OR c.title LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Count pages with filters
   */
  async countWithFilters(filters = {}) {
    const { status, content_type, search } = filters;

    let sql = `SELECT COUNT(*) as count FROM pages p
               LEFT JOIN content c ON p.content_id = c.id WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (content_type) {
      sql += ' AND p.content_type = ?';
      params.push(content_type);
    }

    if (search) {
      sql += ' AND (p.title LIKE ? OR c.title LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const result = await query(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Get published pages by type
   */
  async getPublishedByType(contentType, limit = 50) {
    return await query(
      `SELECT p.* FROM pages p
       WHERE p.content_type = ? AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [contentType, limit]
    );
  }

  /**
   * Get pages by IDs with content
   */
  async getByIdsWithContent(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(',');
    return await query(
      `SELECT p.*, c.title as content_title, c.data as content_data
       FROM pages p
       LEFT JOIN content c ON p.content_id = c.id
       WHERE p.id IN (${placeholders})`,
      ids
    );
  }

  /**
   * Update page status
   */
  async updateStatus(pageId, status) {
    const timestamp = status === 'published' ? new Date().toISOString() : null;
    await query(
      `UPDATE pages SET status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, timestamp, pageId]
    );
    return this.findById(pageId);
  }

  /**
   * Get home page
   */
  async getHome() {
    const results = await query(
      `SELECT p.* FROM pages p WHERE p.slug = '/' LIMIT 1`
    );
    return results[0] || null;
  }

  /**
   * Get recent published pages
   */
  async getRecentPublished(limit = 10) {
    return await query(
      `SELECT p.* FROM pages p
       WHERE p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get pages by parent/related
   */
  async getByContentId(contentId) {
    return await query(
      `SELECT p.* FROM pages p WHERE p.content_id = ?`,
      [contentId]
    );
  }

  /**
   * Search pages
   */
  async search(query_text, limit = 20) {
    return await query(
      `SELECT p.*, MATCH(p.title) AGAINST(? IN BOOLEAN MODE) as relevance
       FROM pages p
       WHERE p.status = 'published'
       AND (MATCH(p.title) AGAINST(? IN BOOLEAN MODE) OR p.title LIKE ?)
       ORDER BY relevance DESC, p.created_at DESC
       LIMIT ?`,
      [query_text, query_text, `%${query_text}%`, limit]
    );
  }
}

export default PageRepository;
