import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * List all content types (for navigation)
 * GET /api/content-types
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const contentTypes = await query(`
      SELECT * FROM content_types
      WHERE show_in_menu = TRUE
      ORDER BY menu_order, name
    `);
    res.json(contentTypes);
  } catch (err) {
    console.error('List content types error:', err);
    res.status(500).json({ error: 'Failed to list content types' });
  }
});

/**
 * Get single content type
 * GET /api/content-types/:name
 */
router.get('/:name', requireAuth, async (req, res) => {
  try {
    const types = await query(
      'SELECT * FROM content_types WHERE name = ?',
      [req.params.name]
    );

    if (!types[0]) {
      return res.status(404).json({ error: 'Content type not found' });
    }

    res.json(types[0]);
  } catch (err) {
    console.error('Get content type error:', err);
    res.status(500).json({ error: 'Failed to get content type' });
  }
});

/**
 * Update content type settings (admin only)
 * PUT /api/content-types/:name
 */
router.put('/:name', requireAdmin, async (req, res) => {
  const { label, plural_label, icon, color, menu_order, show_in_menu, has_status, has_seo } = req.body;

  try {
    // Prevent modification of system types
    const types = await query(
      'SELECT is_system FROM content_types WHERE name = ?',
      [req.params.name]
    );

    if (!types[0]) {
      return res.status(404).json({ error: 'Content type not found' });
    }

    if (types[0].is_system) {
      return res.status(403).json({ error: 'Cannot modify system content types' });
    }

    const updates = [];
    const params = [];

    if (label !== undefined) {
      updates.push('label = ?');
      params.push(label);
    }
    if (plural_label !== undefined) {
      updates.push('plural_label = ?');
      params.push(plural_label);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (menu_order !== undefined) {
      updates.push('menu_order = ?');
      params.push(menu_order);
    }
    if (show_in_menu !== undefined) {
      updates.push('show_in_menu = ?');
      params.push(show_in_menu);
    }
    if (has_status !== undefined) {
      updates.push('has_status = ?');
      params.push(has_status);
    }
    if (has_seo !== undefined) {
      updates.push('has_seo = ?');
      params.push(has_seo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.name);

    await query(
      `UPDATE content_types SET ${updates.join(', ')} WHERE name = ?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update content type error:', err);
    res.status(500).json({ error: 'Failed to update content type' });
  }
});

export default router;
