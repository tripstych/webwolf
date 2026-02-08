import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { scanTemplates, scanBlockTemplates, syncTemplatesToDb, parseTemplate } from '../services/templateParser.js';

const router = Router();

// List all templates (with optional content_type filter)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { content_type } = req.query;

    let sql = `
      SELECT t.*, COUNT(p.id) as page_count
      FROM templates t
      LEFT JOIN pages p ON t.id = p.template_id
    `;

    const params = [];
    const conditions = ["t.filename NOT LIKE 'blocks/%'"];

    if (content_type) {
      conditions.push('t.content_type = ?');
      params.push(content_type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY t.id ORDER BY t.name';

    const templates = await query(sql, params);

    // Parse JSON regions
    templates.forEach(template => {
      if (template.regions) {
        try {
          template.regions = JSON.parse(template.regions);
        } catch (e) {}
      }
    });

    res.json(templates);
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Get template by ID (e.g., /api/templates/id/23)
router.get('/id/:id', requireAuth, async (req, res) => {
  try {
    const templates = await query('SELECT * FROM templates WHERE id = ?', [req.params.id]);

    if (!templates[0]) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    if (template.regions) {
      try {
        template.regions = JSON.parse(template.regions);
      } catch (e) {}
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

    const templates = await query(`
      SELECT t.*, COUNT(p.id) as page_count
      FROM templates t
      LEFT JOIN pages p ON t.id = p.template_id
      WHERE t.content_type = ?
      GROUP BY t.id
      ORDER BY t.name
    `, [contentType]);

    // Parse JSON regions
    templates.forEach(template => {
      if (template.regions) {
        try {
          template.regions = JSON.parse(template.regions);
        } catch (e) {}
      }
    });

    res.json(templates);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get block templates (e.g., /api/templates/content_type/blocks/list)
router.get('/content_type/blocks/list', requireAuth, async (req, res) => {
  try {
    const templates = await query(`
      SELECT t.*, COUNT(b.id) as block_count
      FROM templates t
      LEFT JOIN blocks b ON t.id = b.template_id
      WHERE t.content_type = 'blocks'
      GROUP BY t.id
      ORDER BY t.name
    `);

    // Parse JSON regions
    templates.forEach(template => {
      if (template.regions) {
        try {
          template.regions = JSON.parse(template.regions);
        } catch (e) {}
      }
    });

    res.json(templates);
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
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (regions !== undefined) {
      updates.push('regions = ?');
      params.push(JSON.stringify(regions));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(req.params.id);
    
    await query(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`, params);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (only if no pages use it)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if any pages use this template
    const pages = await query('SELECT COUNT(*) as count FROM pages WHERE template_id = ?', [req.params.id]);
    
    if (pages[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete template that is in use',
        pageCount: pages[0].count 
      });
    }
    
    await query('DELETE FROM templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
