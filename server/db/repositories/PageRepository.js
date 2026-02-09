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

  /**
   * Get page with full template data
   */
  async getWithTemplate(pageId) {
    const results = await query(
      `SELECT p.*, t.name as template_name, t.filename as template_filename, t.regions as template_regions,
              c.title as content_title, c.slug as content_slug,
              COALESCE(c.data, '{}') as content_data
       FROM pages p
       LEFT JOIN templates t ON p.template_id = t.id
       LEFT JOIN content c ON p.content_id = c.id
       WHERE p.id = ?`,
      [pageId]
    );
    return results[0] || null;
  }

  /**
   * List pages with full template data and content
   */
  async listWithTemplate(filters = {}, limit = 50, offset = 0) {
    const { status, template_id, content_type } = filters;

    let sql = `
      SELECT p.*, t.name as template_name, t.filename as template_filename,
             u1.name as created_by_name, u2.name as updated_by_name,
             c.title as content_title, c.slug as content_slug,
             COALESCE(c.data, '{}') as content_data
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN content c ON p.content_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (template_id) {
      sql += ' AND p.template_id = ?';
      params.push(template_id);
    }

    if (content_type) {
      sql += ' AND p.content_type = ?';
      params.push(content_type);
    }

    sql += ` ORDER BY p.updated_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query(sql, params);
  }

  /**
   * Create page with content in atomic operation
   */
  async createPageWithContent(pageData, contentData) {
    const {
      template_id,
      content_type,
      status,
      meta_title,
      meta_description,
      og_title,
      og_description,
      og_image,
      canonical_url,
      robots,
      schema_markup,
      created_by,
      updated_by,
      slug,
      title
    } = pageData;

    // Create content record first
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      [content_type || 'pages', title, slug, JSON.stringify(contentData || {})]
    );
    const contentId = contentResult.insertId;

    // Create page record
    const pageResult = await query(
      `INSERT INTO pages (
        template_id, content_id, content_type, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template_id,
        contentId,
        content_type || 'pages',
        status || 'draft',
        meta_title || title,
        meta_description || '',
        og_title || '',
        og_description || '',
        og_image || '',
        canonical_url || '',
        robots || 'index, follow',
        JSON.stringify(schema_markup || null),
        created_by,
        updated_by
      ]
    );

    return pageResult.insertId;
  }

  /**
   * Update page with content in atomic operation
   */
  async updatePageWithContent(pageId, pageUpdates, contentUpdates) {
    // Handle content updates
    const page = await this.findById(pageId);
    if (!page) return null;

    if (Object.keys(contentUpdates).length > 0) {
      if (page.content_id) {
        // Update existing content
        const updates = [];
        const params = [];

        if (contentUpdates.title !== undefined) {
          updates.push('title = ?');
          params.push(contentUpdates.title);
        }
        if (contentUpdates.slug !== undefined) {
          updates.push('slug = ?');
          params.push(contentUpdates.slug);
        }
        if (contentUpdates.data !== undefined) {
          updates.push('data = ?');
          params.push(JSON.stringify(contentUpdates.data));
        }

        if (updates.length > 0) {
          params.push(page.content_id);
          await query(
            `UPDATE content SET ${updates.join(', ')} WHERE id = ?`,
            params
          );
        }
      } else if (Object.keys(contentUpdates).length > 0) {
        // Create new content record if page doesn't have one
        const contentResult = await query(
          'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
          [
            pageUpdates.content_type || 'pages',
            contentUpdates.title || null,
            contentUpdates.slug || null,
            JSON.stringify(contentUpdates.data || {})
          ]
        );
        pageUpdates.content_id = contentResult.insertId;
      }
    }

    // Handle page updates
    if (Object.keys(pageUpdates).length > 0) {
      const updates = [];
      const params = [];

      // Handle published_at timestamp
      if (pageUpdates.status === 'published') {
        updates.push('published_at = COALESCE(published_at, NOW())');
      }

      for (const [key, value] of Object.entries(pageUpdates)) {
        if (key === 'status' && value === 'published') continue; // Already handled above
        if (key === 'schema_markup') {
          updates.push('schema_markup = ?');
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(pageId);
        await query(
          `UPDATE pages SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }
    }

    return this.getWithTemplate(pageId);
  }

  /**
   * Duplicate page with new slug
   */
  async duplicatePage(pageId, userId) {
    const page = await this.getWithTemplate(pageId);
    if (!page) return null;

    const contentData = (() => {
      try {
        return JSON.parse(page.content_data || '{}');
      } catch (e) {
        return {};
      }
    })();

    const originalTitle = page.content_title || 'Untitled';
    const originalSlug = page.content_slug || '/';
    const newSlug = `${originalSlug}-copy-${Date.now()}`.replace('//', '/');
    const newTitle = `${originalTitle} (Copy)`;

    // Duplicate content record
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      ['pages', newTitle, newSlug, JSON.stringify(contentData)]
    );
    const newContentId = contentResult.insertId;

    // Duplicate page record
    const result = await query(
      `INSERT INTO pages (
        template_id, content_id, content_type, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page.template_id,
        newContentId,
        page.content_type || 'pages',
        page.meta_title,
        page.meta_description,
        page.og_title,
        page.og_description,
        page.og_image,
        page.canonical_url,
        page.robots,
        page.schema_markup,
        userId,
        userId
      ]
    );

    return { id: result.insertId, slug: newSlug };
  }
}

export default PageRepository;
