import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { scanTemplates, syncTemplatesToDb, parseTemplate } from '../services/templateParser.js';

const router = Router();

// List all templates
router.get('/', requireAuth, async (req, res) => {
  try {
    const templates = await query(`
      SELECT t.*, COUNT(p.id) as page_count
      FROM templates t
      LEFT JOIN pages p ON t.id = p.template_id
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
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Get single template
router.get('/:id', requireAuth, async (req, res) => {
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
