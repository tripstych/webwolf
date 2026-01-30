import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get redirects
router.get('/redirects', requireAuth, async (req, res) => {
  try {
    const redirects = await query('SELECT * FROM redirects ORDER BY source_path');
    res.json(redirects);
  } catch (err) {
    console.error('Get redirects error:', err);
    res.status(500).json({ error: 'Failed to get redirects' });
  }
});

// Create redirect
router.post('/redirects', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { source_path, target_path, status_code = 301 } = req.body;
    
    if (!source_path || !target_path) {
      return res.status(400).json({ error: 'Source and target paths required' });
    }
    
    const result = await query(
      'INSERT INTO redirects (source_path, target_path, status_code) VALUES (?, ?, ?)',
      [source_path, target_path, status_code]
    );
    
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Redirect for this path already exists' });
    }
    console.error('Create redirect error:', err);
    res.status(500).json({ error: 'Failed to create redirect' });
  }
});

// Update redirect
router.put('/redirects/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { source_path, target_path, status_code } = req.body;
    
    await query(
      'UPDATE redirects SET source_path = ?, target_path = ?, status_code = ? WHERE id = ?',
      [source_path, target_path, status_code || 301, req.params.id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update redirect error:', err);
    res.status(500).json({ error: 'Failed to update redirect' });
  }
});

// Delete redirect
router.delete('/redirects/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM redirects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete redirect error:', err);
    res.status(500).json({ error: 'Failed to delete redirect' });
  }
});

// Generate sitemap
router.get('/sitemap', async (req, res) => {
  try {
    const settings = await query('SELECT setting_value FROM settings WHERE setting_key = ?', ['site_url']);
    const siteUrl = settings[0]?.setting_value || 'http://localhost:3000';
    
    const pages = await query(
      'SELECT slug, updated_at FROM pages WHERE status = ? ORDER BY updated_at DESC',
      ['published']
    );
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const page of pages) {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}${page.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }
    
    xml += '</urlset>';
    
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Generate sitemap error:', err);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Get robots.txt content
router.get('/robots', async (req, res) => {
  try {
    const settings = await query('SELECT setting_value FROM settings WHERE setting_key = ?', ['robots_txt']);
    const robotsTxt = settings[0]?.setting_value || 'User-agent: *\nAllow: /';
    
    res.type('text/plain').send(robotsTxt);
  } catch (err) {
    console.error('Get robots.txt error:', err);
    res.status(500).json({ error: 'Failed to get robots.txt' });
  }
});

// SEO analysis for a page
router.get('/analyze/:pageId', requireAuth, async (req, res) => {
  try {
    const pages = await query('SELECT * FROM pages WHERE id = ?', [req.params.pageId]);
    
    if (!pages[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pages[0];
    const issues = [];
    const warnings = [];
    const passed = [];
    
    // Meta title checks
    if (!page.meta_title) {
      issues.push({ field: 'meta_title', message: 'Meta title is missing' });
    } else if (page.meta_title.length < 30) {
      warnings.push({ field: 'meta_title', message: 'Meta title is too short (< 30 chars)' });
    } else if (page.meta_title.length > 60) {
      warnings.push({ field: 'meta_title', message: 'Meta title is too long (> 60 chars)' });
    } else {
      passed.push({ field: 'meta_title', message: 'Meta title length is optimal' });
    }
    
    // Meta description checks
    if (!page.meta_description) {
      issues.push({ field: 'meta_description', message: 'Meta description is missing' });
    } else if (page.meta_description.length < 120) {
      warnings.push({ field: 'meta_description', message: 'Meta description is too short (< 120 chars)' });
    } else if (page.meta_description.length > 160) {
      warnings.push({ field: 'meta_description', message: 'Meta description is too long (> 160 chars)' });
    } else {
      passed.push({ field: 'meta_description', message: 'Meta description length is optimal' });
    }
    
    // OG tags
    if (!page.og_title) {
      warnings.push({ field: 'og_title', message: 'Open Graph title is missing' });
    } else {
      passed.push({ field: 'og_title', message: 'Open Graph title is set' });
    }
    
    if (!page.og_description) {
      warnings.push({ field: 'og_description', message: 'Open Graph description is missing' });
    } else {
      passed.push({ field: 'og_description', message: 'Open Graph description is set' });
    }
    
    if (!page.og_image) {
      warnings.push({ field: 'og_image', message: 'Open Graph image is missing' });
    } else {
      passed.push({ field: 'og_image', message: 'Open Graph image is set' });
    }
    
    // Slug check
    if (page.slug && page.slug.length > 75) {
      warnings.push({ field: 'slug', message: 'URL slug is quite long' });
    } else {
      passed.push({ field: 'slug', message: 'URL slug length is good' });
    }
    
    // Calculate score
    const totalChecks = issues.length + warnings.length + passed.length;
    const score = Math.round(((passed.length + (warnings.length * 0.5)) / totalChecks) * 100);
    
    res.json({
      score,
      issues,
      warnings,
      passed,
      summary: {
        total: totalChecks,
        issueCount: issues.length,
        warningCount: warnings.length,
        passedCount: passed.length
      }
    });
  } catch (err) {
    console.error('SEO analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze page' });
  }
});

export default router;
