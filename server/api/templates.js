import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { scanTemplates, scanBlockTemplates, syncTemplatesToDb, parseTemplate } from '../services/templateParser.js';
import { TemplateRepository } from '../db/repositories/TemplateRepository.js';

const router = Router();
const templateRepo = new TemplateRepository();

// List all templates (with optional content_type filter)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { content_type, limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const templates = await templateRepo.listWithParsedRegions(
      { content_type },
      pageLimit,
      pageOffset
    );

    const total = await templateRepo.countPageTemplates({ content_type });

    res.json({
      data: templates,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Get template by ID (e.g., /api/templates/id/23)
router.get('/id/:id', requireAuth, async (req, res) => {
  try {
    const template = await templateRepo.getWithParsedRegions(parseInt(req.params.id));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Get templates by content type (e.g., /api/templates/content_type/products)
router.get('/content_type/:contentType', requireAuth, async (req, res) => {
  try {
    const { contentType } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const templates = await templateRepo.getByContentType(contentType, pageLimit, pageOffset);

    // Parse regions
    templates.forEach(template => {
      if (template.regions) {
        try {
          template.regions = JSON.parse(template.regions);
        } catch (e) {}
      }
    });

    const total = await templateRepo.countByContentType(contentType);

    res.json({
      data: templates,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get block templates (e.g., /api/templates/content_type/blocks/list)
router.get('/content_type/blocks/list', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const pageLimit = Math.max(1, Math.min(500, parseInt(limit) || 50));
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const templates = await templateRepo.listBlockTemplates(pageLimit, pageOffset);

    // Parse JSON regions
    templates.forEach(template => {
      if (template.regions) {
        try {
          template.regions = JSON.parse(template.regions);
        } catch (e) {}
      }
    });

    const total = await templateRepo.countBlockTemplates();

    res.json({
      data: templates,
      pagination: {
        total,
        limit: pageLimit,
        offset: pageOffset
      }
    });
  } catch (err) {
    console.error('List block templates error:', err);
    res.status(500).json({ error: 'Failed to list block templates' });
  }
});

// Scan filesystem and sync templates to database
router.post('/sync', requireAuth, requireAdmin, async (req, res) => {
  try {
    const templates = await syncTemplatesToDb(query);
    res.json({
      success: true,
      message: `Synced ${templates.length} templates`,
      templates
    });
  } catch (err) {
    console.error('Sync templates error:', err);
    res.status(500).json({ error: 'Failed to sync templates' });
  }
});

// Reload templates in Nunjucks (clears cache)
router.post('/reload', requireAuth, requireAdmin, (req, res) => {
  try {
    const nunjucksEnv = req.app.locals.nunjucksEnv;
    if (!nunjucksEnv) {
      return res.status(500).json({ error: 'Nunjucks environment not found' });
    }

    // Clear the Nunjucks cache by resetting the loader cache
    if (nunjucksEnv.loaders && nunjucksEnv.loaders[0]) {
      const loader = nunjucksEnv.loaders[0];
      if (loader.cache) {
        loader.cache = {};
      }
    }

    // Also try the generic reset method if available
    if (typeof nunjucksEnv.reset === 'function') {
      nunjucksEnv.reset();
    }

    console.log('Templates cache cleared');

    res.json({
      success: true,
      message: 'Templates reloaded successfully'
    });
  } catch (err) {
    console.error('Reload templates error:', err);
    res.status(500).json({ error: `Failed to reload templates: ${err.message}` });
  }
});

// Scan filesystem for templates (without syncing)
router.get('/scan/filesystem', requireAuth, async (req, res) => {
  try {
    const templates = await scanTemplates();
    res.json(templates);
  } catch (err) {
    console.error('Scan templates error:', err);
    res.status(500).json({ error: 'Failed to scan templates' });
  }
});

// Parse a specific template file
router.get('/parse/:filename(*)', requireAuth, async (req, res) => {
  try {
    const regions = await parseTemplate(req.params.filename);
    res.json({ filename: req.params.filename, regions });
  } catch (err) {
    console.error('Parse template error:', err);
    res.status(500).json({ error: 'Failed to parse template' });
  }
});

// Update template metadata
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, regions } = req.body;

    // Check if any fields to update
    const hasUpdates = name !== undefined || description !== undefined || regions !== undefined;

    if (!hasUpdates) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const template = await templateRepo.updateMetadata(parseInt(req.params.id), {
      name,
      description,
      regions
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (only if no pages use it)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    // Check if template is in use
    const pageCount = await templateRepo.countPageUsage(templateId);
    const blockCount = await templateRepo.countBlockUsage(templateId);

    if (pageCount > 0 || blockCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete template that is in use',
        pageCount,
        blockCount
      });
    }

    // Delete template
    await templateRepo.delete(templateId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
