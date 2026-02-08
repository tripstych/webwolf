import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

function normalizeSlug(input) {
  let slug = input || '/';
  if (!slug.startsWith('/')) slug = '/' + slug;
  if (slug !== '/' && slug.endsWith('/')) slug = slug.slice(0, -1);
  return slug;
}

function summarizeFeatures(content) {
  const features = content?.features;
  const isArray = Array.isArray(features);
  return {
    type: features === null ? 'null' : typeof features,
    isArray,
    length: isArray ? features.length : 0
  };
}

router.get('/public-render', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requestedPath = typeof req.query.path === 'string' ? req.query.path : '/';
    const normalizedSlug = normalizeSlug(requestedPath);

    const pages = await query(`
      SELECT p.id, p.slug, p.status, p.template_id, p.title, p.content, t.filename as template_filename
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      WHERE p.slug = ? AND p.status = 'published'
      ORDER BY p.updated_at DESC, p.id DESC
    `, [normalizedSlug]);

    const candidates = pages.map(p => {
      let parsedContent = {};
      if (p.content) {
        try {
          parsedContent = JSON.parse(p.content);
        } catch {
          parsedContent = {};
        }
      }
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        template_filename: p.template_filename,
        features: summarizeFeatures(parsedContent)
      };
    });

    const selected = candidates[0] || null;

    res.json({
      requestedPath,
      normalizedSlug,
      matches: candidates.length,
      candidates,
      selected
    });
  } catch (err) {
    console.error('Debug public-render error:', err);
    res.status(500).json({ error: 'Failed to debug public rendering' });
  }
});

/**
 * Get all content for UI dropdowns
 */
router.get('/all-content', requireAuth, async (req, res) => {
  try {
    const content = await query(`
      SELECT DISTINCT id, module, slug, title
      FROM content
      ORDER BY title ASC, slug ASC
    `);

    res.json(content);
  } catch (err) {
    console.error('Error fetching all content:', err);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

export default router;
