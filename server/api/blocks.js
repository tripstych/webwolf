import express from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import slugify from 'slugify';

const router = express.Router();

// Get all blocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { content_type } = req.query;

    let sql = `
      SELECT b.*, t.name as template_name, COALESCE(c.data, '{}') as content_data
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
      LEFT JOIN content c ON b.content_id = c.id
    `;
    const params = [];

    if (content_type) {
      sql += ' WHERE b.content_type = ?';
      params.push(content_type);
    }

    sql += ' ORDER BY b.name';

    const blocks = await query(sql, params);

    // Parse content JSON
    blocks.forEach(block => {
      try {
        block.content = JSON.parse(block.content_data || '{}');
      } catch (e) {
        block.content = {};
      }
      delete block.content_data;
    });

    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single block
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [block] = await query(`
      SELECT b.*, t.name as template_name, t.regions, COALESCE(c.data, '{}') as content_data
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
      LEFT JOIN content c ON b.content_id = c.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Parse content and regions
    try {
      block.content = JSON.parse(block.content_data || '{}');
    } catch (e) {
      block.content = {};
    }
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
    const { template_id, name, description, content, content_type } = req.body;

    console.log('[BLOCKS:POST] Received content type:', typeof content);
    console.log('[BLOCKS:POST] Content keys:', content ? Object.keys(content) : 'null');

    if (!name || !template_id) {
      return res.status(400).json({ error: 'Name and template are required' });
    }

    // Validate template belongs to the blocks content type
    const templates = await query(
      'SELECT content_type FROM templates WHERE id = ?',
      [template_id]
    );

    if (!templates[0]) {
      return res.status(400).json({ error: 'Template not found' });
    }

    if (templates[0].content_type !== 'blocks') {
      return res.status(400).json({
        error: `Template belongs to "${templates[0].content_type}" content type, not "blocks"`
      });
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Create content record first
    let contentId = null;
    if (content && Object.keys(content).length > 0) {
      const contentResult = await query(
        'INSERT INTO content (type, data) VALUES (?, ?)',
        ['blocks', JSON.stringify(content)]
      );
      contentId = contentResult.insertId;
    }

    const result = await query(
      `INSERT INTO blocks (template_id, name, slug, description, content_id, content_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [template_id, name, slug, description || null, contentId || null, content_type || 'blocks', req.user?.id || null]
    );

    const [block] = await query(`
      SELECT b.*, COALESCE(c.data, '{}') as content_data
      FROM blocks b
      LEFT JOIN content c ON b.content_id = c.id
      WHERE b.id = ?
    `, [result.insertId]);

    // Parse content
    try {
      block.content = JSON.parse(block.content_data || '{}');
    } catch (e) {
      block.content = {};
    }

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
    const { template_id, name, description, content, content_type } = req.body;

    console.log('[BLOCKS:PUT] Received content type:', typeof content);
    console.log('[BLOCKS:PUT] Content keys:', content ? Object.keys(content) : 'null');

    // Validate template belongs to blocks content type if changing it
    if (template_id !== undefined) {
      const templates = await query(
        'SELECT content_type FROM templates WHERE id = ?',
        [template_id]
      );

      if (!templates[0]) {
        return res.status(400).json({ error: 'Template not found' });
      }

      if (templates[0].content_type !== 'blocks') {
        return res.status(400).json({
          error: `Template belongs to "${templates[0].content_type}" content type, not "blocks"`
        });
      }
    }

    const slug = name ? slugify(name, { lower: true, strict: true }) : undefined;

    // Get current block to handle content updates
    const [existingBlock] = await query(
      'SELECT content_id FROM blocks WHERE id = ?',
      [req.params.id]
    );

    if (!existingBlock) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Handle content update
    let contentIdToSet = existingBlock.content_id;
    if (content !== undefined) {
      if (contentIdToSet) {
        // Update existing content
        await query(
          'UPDATE content SET data = ? WHERE id = ?',
          [JSON.stringify(content), contentIdToSet]
        );
      } else if (content && Object.keys(content).length > 0) {
        // Create new content record
        const contentResult = await query(
          'INSERT INTO content (type, data) VALUES (?, ?)',
          ['blocks', JSON.stringify(content)]
        );
        contentIdToSet = contentResult.insertId;
      }
    }

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
      updates.push('content_id = ?');
      values.push(contentIdToSet || null);
    }
    if (content_type !== undefined) {
      updates.push('content_type = ?');
      values.push(content_type);
    }

    updates.push('updated_by = ?');
    values.push(req.user?.id || null);

    values.push(req.params.id);

    if (updates.length > 0) {
      await query(
        `UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [block] = await query(`
      SELECT b.*, COALESCE(c.data, '{}') as content_data
      FROM blocks b
      LEFT JOIN content c ON b.content_id = c.id
      WHERE b.id = ?
    `, [req.params.id]);

    // Parse content
    try {
      block.content = JSON.parse(block.content_data || '{}');
    } catch (e) {
      block.content = {};
    }

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
