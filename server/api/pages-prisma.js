import { Router } from 'express';
import slugify from 'slugify';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// List all pages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, template_id, content_type, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    // Build filters
    const where = {};
    if (status) where.status = status;
    if (template_id) where.template_id = parseInt(template_id);
    if (content_type) where.content_type = content_type;

    // Fetch pages with content and template
    const pages = await prisma.pages.findMany({
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
      orderBy: { updated_at: 'desc' },
      take: pageLimit,
      skip: pageOffset
    });

    // Count total
    const total = await prisma.pages.count({ where });

    // Transform response
    const transformedPages = pages.map(page => ({
      ...page,
      template_name: page.templates?.name,
      template_filename: page.templates?.filename,
      template_regions: page.templates?.regions ? JSON.parse(page.templates.regions) : [],
      content: page.content?.data ? JSON.parse(page.content.data) : {},
      title: page.content?.title || page.title,
      slug: page.content?.slug || page.slug
    }));

    res.json({
      data: transformedPages,
      pagination: { total, limit: pageLimit, offset: pageOffset }
    });
  } catch (err) {
    console.error('List pages error:', err);
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

// Get single page
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);

    const page = await prisma.pages.findUnique({
      where: { id: pageId },
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

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({
      ...page,
      template_name: page.templates?.name,
      template_filename: page.templates?.filename,
      template_regions: page.templates?.regions ? JSON.parse(page.templates.regions) : [],
      content: page.content?.data ? JSON.parse(page.content.data) : {},
      title: page.content?.title || page.title,
      slug: page.content?.slug || page.slug
    });
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
      content_type = 'pages',
      status = 'draft',
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

    // Validate template exists and belongs to correct content type
    const template = await prisma.templates.findUnique({
      where: { id: parseInt(template_id) }
    });

    if (!template) {
      return res.status(400).json({ error: 'Template not found' });
    }

    if (template.content_type !== content_type) {
      return res.status(400).json({
        error: `Template belongs to "${template.content_type}" content type, not "${content_type}"`
      });
    }

    // Generate slug
    let slug = providedSlug || slugify(title, { lower: true, strict: true });
    if (!slug.startsWith(`/${content_type}/`)) {
      slug = slug.replace(/^\/+/, '');
      slug = `/${content_type}/` + slug;
    }

    // Create content record first
    const contentRecord = await prisma.content.create({
      data: {
        module: content_type,
        title,
        slug,
        data: JSON.stringify(content || {})
      }
    });

    // Create page
    const page = await prisma.pages.create({
      data: {
        template_id: parseInt(template_id),
        content_id: contentRecord.id,
        title,
        slug,
        content_type,
        status,
        meta_title: meta_title || title,
        meta_description: meta_description || '',
        og_title: og_title || '',
        og_description: og_description || '',
        og_image: og_image || '',
        canonical_url: canonical_url || '',
        robots: robots || 'index, follow',
        schema_markup: schema_markup ? JSON.stringify(schema_markup) : null,
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null
      }
    });

    res.status(201).json({ id: page.id, slug: page.slug });
  } catch (err) {
    if (err.code === 'P2002') {
      // Unique constraint violation (slug already exists)
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error('Create page error:', err);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update page
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
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

    // Get existing page
    const existingPage = await prisma.pages.findUnique({
      where: { id: pageId }
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Validate template if changing
    if (template_id && template_id !== existingPage.template_id) {
      const template = await prisma.templates.findUnique({
        where: { id: parseInt(template_id) }
      });
      if (!template) {
        return res.status(400).json({ error: 'Template not found' });
      }
    }

    // Update page
    const updateData = {};
    if (template_id !== undefined) updateData.template_id = parseInt(template_id);
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (status !== undefined) updateData.status = status;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (og_title !== undefined) updateData.og_title = og_title;
    if (og_description !== undefined) updateData.og_description = og_description;
    if (og_image !== undefined) updateData.og_image = og_image;
    if (canonical_url !== undefined) updateData.canonical_url = canonical_url;
    if (robots !== undefined) updateData.robots = robots;
    if (schema_markup !== undefined) updateData.schema_markup = schema_markup ? JSON.stringify(schema_markup) : null;
    if (status === 'published') updateData.published_at = new Date();
    updateData.updated_by = req.user?.id || null;

    const updatedPage = await prisma.pages.update({
      where: { id: pageId },
      data: updateData
    });

    // Update content if provided
    if (content || title) {
      if (existingPage.content_id) {
        await prisma.content.update({
          where: { id: existingPage.content_id },
          data: {
            ...(content && { data: JSON.stringify(content) }),
            ...(title && { title })
          }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error('Update page error:', err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete page
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);

    const page = await prisma.pages.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Delete page (cascade will handle content deletion if configured)
    await prisma.pages.delete({
      where: { id: pageId }
    });

    // Delete orphaned content
    if (page.content_id) {
      await prisma.content.deleteMany({
        where: { id: page.content_id }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Duplicate page
router.post('/:id/duplicate', requireAuth, requireEditor, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);

    const originalPage = await prisma.pages.findUnique({
      where: { id: pageId },
      include: { content: true }
    });

    if (!originalPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Create new slug
    const newSlug = `${originalPage.slug}-${Date.now()}`;

    // Create new content
    const newContent = await prisma.content.create({
      data: {
        module: originalPage.content?.module || 'pages',
        title: `${originalPage.content?.title || originalPage.title} (Copy)`,
        slug: newSlug,
        data: originalPage.content?.data || '{}'
      }
    });

    // Create duplicated page
    const duplicatedPage = await prisma.pages.create({
      data: {
        template_id: originalPage.template_id,
        content_id: newContent.id,
        title: `${originalPage.title} (Copy)`,
        slug: newSlug,
        content_type: originalPage.content_type,
        status: 'draft',
        meta_title: originalPage.meta_title,
        meta_description: originalPage.meta_description,
        og_title: originalPage.og_title,
        og_description: originalPage.og_description,
        og_image: originalPage.og_image,
        canonical_url: originalPage.canonical_url,
        robots: originalPage.robots,
        schema_markup: originalPage.schema_markup,
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null
      }
    });

    res.status(201).json({ id: duplicatedPage.id, slug: duplicatedPage.slug });
  } catch (err) {
    console.error('Duplicate page error:', err);
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

export default router;
