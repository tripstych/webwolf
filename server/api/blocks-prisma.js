import { Router } from 'express';
import slugify from 'slugify';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// List all blocks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { content_type, limit = 50, offset = 0 } = req.query;

    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const where = {};
    if (content_type) where.content_type = content_type;

    const blocks = await prisma.blocks.findMany({
      where,
      include: {
        content: true,
        templates: {
          select: {
            id: true,
            name: true,
            filename: true,
            regions: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: pageLimit,
      skip: pageOffset
    });

    const total = await prisma.blocks.count({ where });

    const transformedBlocks = blocks.map(block => ({
      ...block,
      template_name: block.templates?.name,
      template_filename: block.templates?.filename,
      template_regions: block.templates?.regions ? JSON.parse(block.templates.regions) : [],
      content: block.content?.data ? JSON.parse(block.content.data) : {},
      title: block.content?.title || block.name
    }));

    res.json({
      data: transformedBlocks,
      pagination: { total, limit: pageLimit, offset: pageOffset }
    });
  } catch (err) {
    console.error('List blocks error:', err);
    res.status(500).json({ error: 'Failed to list blocks' });
  }
});

// Get single block
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const blockId = parseInt(req.params.id);

    const block = await prisma.blocks.findUnique({
      where: { id: blockId },
      include: {
        content: true,
        templates: {
          select: {
            id: true,
            name: true,
            filename: true,
            regions: true
          }
        }
      }
    });

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({
      ...block,
      template_name: block.templates?.name,
      template_filename: block.templates?.filename,
      template_regions: block.templates?.regions ? JSON.parse(block.templates.regions) : [],
      content: block.content?.data ? JSON.parse(block.content.data) : {},
      title: block.content?.title || block.name
    });
  } catch (err) {
    console.error('Get block error:', err);
    res.status(500).json({ error: 'Failed to get block' });
  }
});

// Create block
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const {
      template_id,
      name,
      description,
      content,
      content_type = 'blocks'
    } = req.body;

    if (!name || !template_id) {
      return res.status(400).json({ error: 'Name and template are required' });
    }

    // Validate template
    const template = await prisma.templates.findUnique({
      where: { id: parseInt(template_id) }
    });

    if (!template) {
      return res.status(400).json({ error: 'Template not found' });
    }

    if (template.content_type !== 'blocks') {
      return res.status(400).json({
        error: `Template belongs to "${template.content_type}" content type, not "blocks"`
      });
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Create content
    const contentRecord = await prisma.content.create({
      data: {
        module: 'blocks',
        title: name,
        slug,
        data: JSON.stringify(content || {})
      }
    });

    // Create block
    const block = await prisma.blocks.create({
      data: {
        template_id: parseInt(template_id),
        content_id: contentRecord.id,
        name,
        slug,
        description,
        content_type: 'blocks',
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null
      }
    });

    res.status(201).json({ id: block.id, slug: block.slug });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error('Create block error:', err);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// Update block
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const blockId = parseInt(req.params.id);
    const {
      template_id,
      name,
      slug,
      description,
      content
    } = req.body;

    const existingBlock = await prisma.blocks.findUnique({
      where: { id: blockId }
    });

    if (!existingBlock) {
      return res.status(404).json({ error: 'Block not found' });
    }

    if (template_id && template_id !== existingBlock.template_id) {
      const template = await prisma.templates.findUnique({
        where: { id: parseInt(template_id) }
      });
      if (!template) {
        return res.status(400).json({ error: 'Template not found' });
      }
    }

    const updateData = {};
    if (template_id !== undefined) updateData.template_id = parseInt(template_id);
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    updateData.updated_by = req.user?.id || null;

    await prisma.blocks.update({
      where: { id: blockId },
      data: updateData
    });

    if (content || name) {
      if (existingBlock.content_id) {
        await prisma.content.update({
          where: { id: existingBlock.content_id },
          data: {
            ...(content && { data: JSON.stringify(content) }),
            ...(name && { title: name })
          }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error('Update block error:', err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// Delete block
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const blockId = parseInt(req.params.id);

    const block = await prisma.blocks.findUnique({
      where: { id: blockId }
    });

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    await prisma.blocks.delete({
      where: { id: blockId }
    });

    if (block.content_id) {
      await prisma.content.deleteMany({
        where: { id: block.content_id }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete block error:', err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

export default router;
