import { Router } from 'express';
import slugify from 'slugify';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';

const router = Router();


// List all pages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, template_id, content_type } = req.query;

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

    sql += ' ORDER BY p.updated_at DESC';

    const pages = await query(sql, params);

    // Parse JSON content
    pages.forEach(page => {
      try {
        page.content = JSON.parse(page.content_data || '{}');
      } catch (e) {
        page.content = {};
      }
      delete page.content_data;

      // Add title and slug from content table
      page.title = page.content_title;
      page.slug = page.content_slug;
      delete page.content_title;
      delete page.content_slug;

      if (page.schema_markup) {
        try {
          page.schema_markup = JSON.parse(page.schema_markup);
        } catch (e) {}
      }
    });

    res.json(pages);
  } catch (err) {
    console.error('List pages error:', err);
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

// Get single page
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pages = await query(`
      SELECT p.*, t.name as template_name, t.filename as template_filename, t.regions as template_regions,
             c.title as content_title, c.slug as content_slug,
             COALESCE(c.data, '{}') as content_data
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      LEFT JOIN content c ON p.content_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!pages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = pages[0];

    // Parse JSON fields
    try {
      page.content = JSON.parse(page.content_data || '{}');
    } catch (e) {
      page.content = {};
    }
    delete page.content_data;

    // Add title and slug from content table
    page.title = page.content_title;
    page.slug = page.content_slug;
    delete page.content_title;
    delete page.content_slug;

    ['schema_markup', 'template_regions'].forEach(field => {
      if (page[field]) {
        try {
          page[field] = JSON.parse(page[field]);
        } catch (e) {}
      }
    });

    res.json(page);
  } catch (err) {
    console.error('Get page error:', err);
    res.status(500).json({ error: 'Failed to get page' });
  }
});

// Create page
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const {
      template_id,
      title,
      slug: providedSlug,
      content,
      content_type,
      status,
      meta_title,
      meta_description,
      og_title,
      og_description,
      og_image,
      canonical_url,
      robots,
      schema_markup
    } = req.body;

    if (!template_id || !title) {
      return res.status(400).json({ error: 'Template and title required' });
    }

    // Validate template belongs to the correct content type
    const templates = await query(
      'SELECT content_type FROM templates WHERE id = ?',
      [template_id]
    );

    if (!templates[0]) {
      return res.status(400).json({ error: 'Template not found' });
    }

    if (templates[0].content_type !== (content_type || 'pages')) {
      return res.status(400).json({
        error: `Template belongs to "${templates[0].content_type}" content type, not "${content_type || 'pages'}"`
      });
    }

    // Generate slug if not provided
    let slug = providedSlug || slugify(title, { lower: true, strict: true });

    // Prepend /pages/ if not already present (keeps slug globally unique)
    if (!slug.startsWith('/pages/')) {
      slug = slug.replace(/^\/+/, '');
      slug = '/pages/' + slug;
    }

    // Create content record
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      [content_type || 'pages', title, slug, JSON.stringify(content || {})]
    );
    const contentId = contentResult.insertId;

    const result = await query(`
      INSERT INTO pages (
        template_id, content_id, content_type, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      req.user.id,
      req.user.id
    ]);

    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    console.error('Create page error:', err);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update page
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const {
      template_id,
      title,
      slug,
      content,
      content_type,
      status,
      meta_title,
      meta_description,
      og_title,
      og_description,
      og_image,
      canonical_url,
      robots,
      schema_markup
    } = req.body;

    // Validate template belongs to the correct content type if changing it
    if (template_id !== undefined) {
      const templates = await query(
        'SELECT content_type FROM templates WHERE id = ?',
        [template_id]
      );

      if (!templates[0]) {
        return res.status(400).json({ error: 'Template not found' });
      }

      // Get current page to check content_type
      const pages = await query(
        'SELECT content_type FROM pages WHERE id = ?',
        [req.params.id]
      );

      if (!pages[0]) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const pageContentType = content_type !== undefined ? content_type : pages[0].content_type;

      if (templates[0].content_type !== pageContentType) {
        return res.status(400).json({
          error: `Template belongs to "${templates[0].content_type}" content type, not "${pageContentType}"`
        });
      }
    }

    // Get current page to handle content updates
    const existingPages = await query(
      'SELECT content_id FROM pages WHERE id = ?',
      [req.params.id]
    );

    if (!existingPages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Handle content update
    let contentIdToSet = existingPages[0].content_id;

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
        let normalizedSlug = slug;
        // Ensure slug starts with /
        if (!normalizedSlug.startsWith('/')) {
          normalizedSlug = '/' + normalizedSlug;
        }
        contentUpdates.push('slug = ?');
        contentParams.push(normalizedSlug);
      }
      if (content !== undefined) {
        contentUpdates.push('data = ?');
        contentParams.push(JSON.stringify(contentData));
      }

      if (contentIdToSet && contentUpdates.length > 0) {
        contentParams.push(contentIdToSet);
        await query(`UPDATE content SET ${contentUpdates.join(', ')} WHERE id = ?`, contentParams);
      } else if (!contentIdToSet && Object.keys(contentData).length > 0) {
        const contentResult = await query(
          'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
          [content_type || 'pages', title || null, slug || null, JSON.stringify(contentData)]
        );
        contentIdToSet = contentResult.insertId;
      }
    }

    // Build pages table update
    const updates = [];
    const params = [];

    if (template_id !== undefined) {
      updates.push('template_id = ?');
      params.push(template_id);
    }
    if (contentIdToSet !== undefined && !existingPages[0].content_id) {
      updates.push('content_id = ?');
      params.push(contentIdToSet);
    }
    if (content_type !== undefined) {
      updates.push('content_type = ?');
      params.push(content_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);

      // Set published_at when first published
      if (status === 'published') {
        updates.push('published_at = COALESCE(published_at, NOW())');
      }
    }
    if (meta_title !== undefined) {
      updates.push('meta_title = ?');
      params.push(meta_title);
    }
    if (meta_description !== undefined) {
      updates.push('meta_description = ?');
      params.push(meta_description);
    }
    if (og_title !== undefined) {
      updates.push('og_title = ?');
      params.push(og_title);
    }
    if (og_description !== undefined) {
      updates.push('og_description = ?');
      params.push(og_description);
    }
    if (og_image !== undefined) {
      updates.push('og_image = ?');
      params.push(og_image);
    }
    if (canonical_url !== undefined) {
      updates.push('canonical_url = ?');
      params.push(canonical_url);
    }
    if (robots !== undefined) {
      updates.push('robots = ?');
      params.push(robots);
    }
    if (schema_markup !== undefined) {
      updates.push('schema_markup = ?');
      params.push(JSON.stringify(schema_markup));
    }

    updates.push('updated_by = ?');
    params.push(req.user.id);

    params.push(req.params.id);

    if (updates.length > 0) {
      await query(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error('Update page error:', err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete page
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    await query('DELETE FROM pages WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Duplicate page
router.post('/:id/duplicate', requireAuth, requireEditor, async (req, res) => {
  try {
    const pages = await query(`
      SELECT p.*,
             c.title as content_title, c.slug as content_slug,
             COALESCE(c.data, '{}') as content_data
      FROM pages p
      LEFT JOIN content c ON p.content_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!pages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const original = pages[0];
    let contentData = {};
    try {
      contentData = JSON.parse(original.content_data || '{}');
    } catch (e) {
      contentData = {};
    }

    const originalTitle = original.content_title || 'Untitled';
    const originalSlug = original.content_slug || '/';
    const newSlug = `${originalSlug}-copy-${Date.now()}`.replace('//', '/');
    const newTitle = `${originalTitle} (Copy)`;

    // Duplicate content record with updated title and slug
    const contentResult = await query(
      'INSERT INTO content (module, title, slug, data) VALUES (?, ?, ?, ?)',
      ['pages', newTitle, newSlug, JSON.stringify(contentData)]
    );
    const newContentId = contentResult.insertId;

    const result = await query(`
      INSERT INTO pages (
        template_id, content_id, content_type, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      original.template_id,
      newContentId,
      original.content_type || 'pages',
      original.meta_title,
      original.meta_description,
      original.og_title,
      original.og_description,
      original.og_image,
      original.canonical_url,
      original.robots,
      original.schema_markup,
      req.user.id,
      req.user.id
    ]);

    res.status(201).json({ id: result.insertId, slug: newSlug });
  } catch (err) {
    console.error('Duplicate page error:', err);
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

export default router;
