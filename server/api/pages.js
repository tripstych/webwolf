import { Router } from 'express';
import slugify from 'slugify';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';

const router = Router();

// List all pages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, template_id } = req.query;
    
    let sql = `
      SELECT p.*, t.name as template_name, t.filename as template_filename,
             u1.name as created_by_name, u2.name as updated_by_name
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
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
    
    sql += ' ORDER BY p.updated_at DESC';
    
    const pages = await query(sql, params);
    
    // Parse JSON content
    pages.forEach(page => {
      if (page.content) {
        try {
          page.content = JSON.parse(page.content);
        } catch (e) {}
      }
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
      SELECT p.*, t.name as template_name, t.filename as template_filename, t.regions as template_regions
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!pages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pages[0];
    
    // Parse JSON fields
    ['content', 'schema_markup', 'template_regions'].forEach(field => {
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
    
    // Generate slug if not provided
    let slug = providedSlug || slugify(title, { lower: true, strict: true });
    
    // Ensure slug starts with /
    if (!slug.startsWith('/')) {
      slug = '/' + slug;
    }
    
    const result = await query(`
      INSERT INTO pages (
        template_id, title, slug, content, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      template_id,
      title,
      slug,
      JSON.stringify(content || {}),
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
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
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
    
    // Build update dynamically
    const updates = [];
    const params = [];
    
    if (template_id !== undefined) {
      updates.push('template_id = ?');
      params.push(template_id);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (slug !== undefined) {
      let normalizedSlug = slug;
      if (!normalizedSlug.startsWith('/')) {
        normalizedSlug = '/' + normalizedSlug;
      }
      updates.push('slug = ?');
      params.push(normalizedSlug);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(JSON.stringify(content));
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
    
    await query(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, params);
    
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
    const pages = await query('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    
    if (!pages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const original = pages[0];
    const newSlug = `${original.slug}-copy-${Date.now()}`;
    
    const result = await query(`
      INSERT INTO pages (
        template_id, title, slug, content, status,
        meta_title, meta_description, og_title, og_description, og_image,
        canonical_url, robots, schema_markup, created_by, updated_by
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      original.template_id,
      `${original.title} (Copy)`,
      newSlug,
      original.content,
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
