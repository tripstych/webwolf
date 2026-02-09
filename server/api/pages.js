import { Router } from 'express';
import slugify from 'slugify';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import { PageRepository } from '../db/repositories/PageRepository.js';

const router = Router();
const pageRepo = new PageRepository();


// List all pages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, template_id, content_type, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const pages = await pageRepo.listWithTemplate(
      { status, template_id, content_type },
      pageLimit,
      pageOffset
    );

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

    const total = await pageRepo.countWithFilters({ status, template_id, content_type });

    res.json({
      data: pages,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    console.error('List pages error:', err);
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

// Get single page
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const page = await pageRepo.getWithTemplate(parseInt(req.params.id));

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

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

    // Create page with content
    const pageId = await pageRepo.createPageWithContent(
      {
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
        created_by: req.user.id,
        updated_by: req.user.id,
        slug,
        title
      },
      content
    );

    res.status(201).json({ id: pageId, slug });
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
      const page = await pageRepo.findById(parseInt(req.params.id));

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const pageContentType = content_type !== undefined ? content_type : page.content_type;

      if (templates[0].content_type !== pageContentType) {
        return res.status(400).json({
          error: `Template belongs to "${templates[0].content_type}" content type, not "${pageContentType}"`
        });
      }
    }

    // Get current page to check if it exists
    const existingPage = await pageRepo.findById(parseInt(req.params.id));
    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Build content updates
    const contentUpdates = {};
    if (title !== undefined) {
      contentUpdates.title = title;
    }
    if (slug !== undefined) {
      // Normalize slug
      let normalizedSlug = slug;
      if (!normalizedSlug.startsWith('/')) {
        normalizedSlug = '/' + normalizedSlug;
      }
      contentUpdates.slug = normalizedSlug;
    }
    if (content !== undefined) {
      // Get existing content data and merge
      if (existingPage.content_id) {
        const contentRows = await query('SELECT data FROM content WHERE id = ?', [existingPage.content_id]);
        let contentData = {};
        if (contentRows[0]) {
          try {
            contentData = JSON.parse(contentRows[0].data || '{}');
          } catch (e) {
            contentData = {};
          }
        }
        contentUpdates.data = { ...contentData, ...content };
      } else {
        contentUpdates.data = content;
      }
    }

    // Build page updates
    const pageUpdates = {};
    if (template_id !== undefined) pageUpdates.template_id = template_id;
    if (content_type !== undefined) pageUpdates.content_type = content_type;
    if (status !== undefined) pageUpdates.status = status;
    if (meta_title !== undefined) pageUpdates.meta_title = meta_title;
    if (meta_description !== undefined) pageUpdates.meta_description = meta_description;
    if (og_title !== undefined) pageUpdates.og_title = og_title;
    if (og_description !== undefined) pageUpdates.og_description = og_description;
    if (og_image !== undefined) pageUpdates.og_image = og_image;
    if (canonical_url !== undefined) pageUpdates.canonical_url = canonical_url;
    if (robots !== undefined) pageUpdates.robots = robots;
    if (schema_markup !== undefined) pageUpdates.schema_markup = schema_markup;
    pageUpdates.updated_by = req.user.id;

    // Update page with content
    await pageRepo.updatePageWithContent(
      parseInt(req.params.id),
      pageUpdates,
      contentUpdates
    );

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
    await pageRepo.delete(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Duplicate page
router.post('/:id/duplicate', requireAuth, requireEditor, async (req, res) => {
  try {
    const result = await pageRepo.duplicatePage(parseInt(req.params.id), req.user.id);

    if (!result) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('Duplicate page error:', err);
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

export default router;
