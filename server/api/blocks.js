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

    // Parse content and regions
    block.content = block.content ? JSON.parse(block.content) : {};
    block.regions = block.regions ? JSON.parse(block.regions) : [];

    res.json(block);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create block
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content } = req.body;

    if (!name || !template_id) {
      return res.status(400).json({ error: 'Name and template are required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const result = await query(
      `INSERT INTO blocks (template_id, name, slug, description, content, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [template_id, name, slug, description || null, JSON.stringify(content || {}), req.user?.id || null]
    );

    const [block] = await query('SELECT * FROM blocks WHERE id = ?', [result.insertId]);
    block.content = block.content ? JSON.parse(block.content) : {};
    res.status(201).json(block);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update block
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content } = req.body;

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
      updates.push('content = ?');
      values.push(JSON.stringify(content));
    }

    updates.push('updated_by = ?');
    values.push(req.user?.id || null);

    values.push(req.params.id);

    await query(
      `UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [block] = await query('SELECT * FROM blocks WHERE id = ?', [req.params.id]);
    block.content = block.content ? JSON.parse(block.content) : {};
    res.json(block);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
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
