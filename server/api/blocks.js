import express from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import slugify from 'slugify';
import { BlockRepository } from '../db/repositories/BlockRepository.js';

const router = express.Router();
const blockRepo = new BlockRepository();

// Get all blocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { content_type, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const blocks = await blockRepo.listForUI(
      { content_type },
      pageLimit,
      pageOffset
    );

    const total = await blockRepo.countWithFilters({ content_type });

    res.json({
      data: blocks,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single block
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const block = await blockRepo.getForUI(parseInt(req.params.id));

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(block);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create block
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content, content_type } = req.body;

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

    // Create block with content
    const blockId = await blockRepo.createBlockWithContent(
      {
        template_id,
        name,
        slug,
        description,
        content_type,
        created_by: req.user?.id || null
      },
      content
    );

    // Get created block for response
    const block = await blockRepo.getForUI(blockId);

    res.status(201).json(block);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
    console.error('[BLOCKS:POST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update block
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const { template_id, name, description, content, content_type } = req.body;

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

    // Check if block exists
    const existingBlock = await blockRepo.findById(parseInt(req.params.id));
    if (!existingBlock) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Build block updates
    const blockUpdates = {};
    if (template_id !== undefined) blockUpdates.template_id = template_id;
    if (name !== undefined) blockUpdates.name = name;
    if (name !== undefined) {
      blockUpdates.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) blockUpdates.description = description || null;
    if (content_type !== undefined) blockUpdates.content_type = content_type;
    blockUpdates.updated_by = req.user?.id || null;

    // Build content updates
    const contentUpdates = {};
    if (content !== undefined) {
      Object.assign(contentUpdates, content);
    }

    // Update block with content
    const block = await blockRepo.updateBlockWithContent(
      parseInt(req.params.id),
      blockUpdates,
      contentUpdates
    );

    // Get clean response
    const response = await blockRepo.getForUI(parseInt(req.params.id));
    res.json(response);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A block with this name already exists' });
    }
    console.error('[BLOCKS:PUT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete block
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    await blockRepo.delete(parseInt(req.params.id));
    res.json({ message: 'Block deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
