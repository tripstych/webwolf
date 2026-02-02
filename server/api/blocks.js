import express from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import slugify from 'slugify';

const router = express.Router();

// Get all blocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const blocks = await query(`
      SELECT b.*, t.name as template_name
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
      ORDER BY b.name
    `);
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single block
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [block] = await query(`
      SELECT b.*, t.name as template_name, t.regions
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Parse content and regions (mysql2 auto-parses JSON fields, so check type first)
    block.content = typeof block.content === 'string' ? JSON.parse(block.content) : (block.content || {});
    block.regions = typeof block.regions === 'string' ? JSON.parse(block.regions) : (block.regions || []);

    // Return only serializable fields
    res.json({
      id: block.id,
      template_id: block.template_id,
      name: block.name,
      slug: block.slug,
      description: block.description,
      content: block.content,
      regions: block.regions,
      template_name: block.template_name,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: block.created_at,
      updated_at: block.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create block
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content } = req.body;

    console.log('[BLOCKS:POST] Received content type:', typeof content);
    console.log('[BLOCKS:POST] Content keys:', content ? Object.keys(content) : 'null');

    if (!name || !template_id) {
      return res.status(400).json({ error: 'Name and template are required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const contentStr = JSON.stringify(content || {});
    console.log('[BLOCKS:POST] Stringified content length:', contentStr.length);
    console.log('[BLOCKS:POST] Stringified content preview:', contentStr.substring(0, 100));

    const result = await query(
      `INSERT INTO blocks (template_id, name, slug, description, content, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [template_id, name, slug, description || null, contentStr, req.user?.id || null]
    );

    const [block] = await query('SELECT * FROM blocks WHERE id = ?', [result.insertId]);
    console.log('[BLOCKS:POST] Retrieved content type:', typeof block.content);
    console.log('[BLOCKS:POST] Retrieved content preview:', String(block.content).substring(0, 100));

    // mysql2 auto-parses JSON fields, so check type first
    block.content = typeof block.content === 'string' ? JSON.parse(block.content) : (block.content || {});

    // Return only serializable fields
    const response = {
      id: block.id,
      template_id: block.template_id,
      name: block.name,
      slug: block.slug,
      description: block.description,
      content: block.content,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: block.created_at,
      updated_at: block.updated_at
    };

    console.log('[BLOCKS:POST] Response content type:', typeof response.content);
    res.status(201).json(response);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
    console.error('[BLOCKS:POST] Error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Update block
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content } = req.body;

    console.log('[BLOCKS:PUT] Received content type:', typeof content);
    console.log('[BLOCKS:PUT] Content keys:', content ? Object.keys(content) : 'null');

    const slug = name ? slugify(name, { lower: true, strict: true }) : undefined;

    const updates = [];
    const values = [];

    if (template_id !== undefined) {
      updates.push('template_id = ?');
      values.push(template_id);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (slug) {
      updates.push('slug = ?');
      values.push(slug);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (content !== undefined) {
      const contentStr = JSON.stringify(content);
      console.log('[BLOCKS:PUT] Stringified content length:', contentStr.length);
      console.log('[BLOCKS:PUT] Stringified content preview:', contentStr.substring(0, 100));
      updates.push('content = ?');
      values.push(contentStr);
    }

    updates.push('updated_by = ?');
    values.push(req.user?.id || null);

    values.push(req.params.id);

    await query(
      `UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [block] = await query('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
    console.log('[BLOCKS:PUT] Retrieved content type:', typeof block.content);
    console.log('[BLOCKS:PUT] Retrieved content preview:', String(block.content).substring(0, 100));

    // mysql2 auto-parses JSON fields, so check type first
    block.content = typeof block.content === 'string' ? JSON.parse(block.content) : (block.content || {});

    // Return only serializable fields
    const response = {
      id: block.id,
      template_id: block.template_id,
      name: block.name,
      slug: block.slug,
      description: block.description,
      content: block.content,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: block.created_at,
      updated_at: block.updated_at
    };

    console.log('[BLOCKS:PUT] Response content type:', typeof response.content);
    res.json(response);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
    console.error('[BLOCKS:PUT] Error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Delete block
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    await query('DELETE FROM blocks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Block deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
