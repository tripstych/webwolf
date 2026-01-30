import express from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth.js';
import slugify from 'slugify';

const router = express.Router();

// Get all menus
router.get('/', requireAuth, async (req, res) => {
  try {
    const menus = await query(`
      SELECT m.*, COUNT(mi.id) as item_count 
      FROM menus m 
      LEFT JOIN menu_items mi ON m.id = mi.menu_id 
      GROUP BY m.id 
      ORDER BY m.name
    `);
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single menu with items
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [menu] = await query('SELECT * FROM menus WHERE id = ?', [req.params.id]);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Get menu items with nested structure
    const items = await query(`
      SELECT mi.*, p.title as page_title, p.slug as page_slug
      FROM menu_items mi
      LEFT JOIN pages p ON mi.page_id = p.id
      WHERE mi.menu_id = ?
      ORDER BY mi.position
    `, [req.params.id]);

    // Build nested tree structure
    const itemMap = {};
    const rootItems = [];

    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        rootItems.push(itemMap[item.id]);
      }
    });

    res.json({ ...menu, items: rootItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get menu by slug (for public use)
router.get('/slug/:slug', async (req, res) => {
  try {
    const [menu] = await query('SELECT * FROM menus WHERE slug = ?', [req.params.slug]);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const items = await query(`
      SELECT mi.*, p.title as page_title, p.slug as page_slug
      FROM menu_items mi
      LEFT JOIN pages p ON mi.page_id = p.id
      WHERE mi.menu_id = ?
      ORDER BY mi.position
    `, [menu.id]);

    // Build nested tree
    const itemMap = {};
    const rootItems = [];

    items.forEach(item => {
      const url = item.page_id ? `/${item.page_slug}` : item.url;
      itemMap[item.id] = { ...item, url, children: [] };
    });

    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        rootItems.push(itemMap[item.id]);
      }
    });

    res.json({ ...menu, items: rootItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create menu
router.post('/', requireAuth, requireEditor, async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const result = await query(
      'INSERT INTO menus (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description || null]
    );

    const [menu] = await query('SELECT * FROM menus WHERE id = ?', [result.insertId]);
    res.status(201).json(menu);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A menu with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update menu
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    await query(
      'UPDATE menus SET name = ?, slug = ?, description = ? WHERE id = ?',
      [name, slug, description || null, req.params.id]
    );

    const [menu] = await query('SELECT * FROM menus WHERE id = ?', [req.params.id]);
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM menus WHERE id = ?', [req.params.id]);
    res.json({ message: 'Menu deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add menu item
router.post('/:id/items', requireAuth, requireEditor, async (req, res) => {
  try {
    const { title, url, page_id, parent_id, target } = req.body;

    // Get max position
    const [maxPos] = await query(
      'SELECT MAX(position) as max_pos FROM menu_items WHERE menu_id = ? AND parent_id IS NULL',
      [req.params.id]
    );
    const position = (maxPos?.max_pos || 0) + 1;

    const result = await query(
      `INSERT INTO menu_items (menu_id, parent_id, title, url, page_id, target, position) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, parent_id || null, title, url || null, page_id || null, target || '_self', position]
    );

    const [item] = await query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update menu item
router.put('/:menuId/items/:itemId', requireAuth, requireEditor, async (req, res) => {
  try {
    const { title, url, page_id, parent_id, target, position } = req.body;

    await query(
      `UPDATE menu_items SET title = ?, url = ?, page_id = ?, parent_id = ?, target = ?, position = ? WHERE id = ? AND menu_id = ?`,
      [title, url || null, page_id || null, parent_id || null, target || '_self', position || 0, req.params.itemId, req.params.menuId]
    );

    const [item] = await query('SELECT * FROM menu_items WHERE id = ?', [req.params.itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
router.delete('/:menuId/items/:itemId', requireAuth, requireEditor, async (req, res) => {
  try {
    await query('DELETE FROM menu_items WHERE id = ? AND menu_id = ?', [req.params.itemId, req.params.menuId]);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder menu items
router.put('/:id/reorder', requireAuth, requireEditor, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, position, parent_id }

    for (const item of items) {
      await query(
        'UPDATE menu_items SET position = ?, parent_id = ? WHERE id = ? AND menu_id = ?',
        [item.position, item.parent_id || null, item.id, req.params.id]
      );
    }

    res.json({ message: 'Menu reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
