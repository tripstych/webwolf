import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';

const router = Router();

/**
 * Helper to recursively get group tree
 */
async function getGroupTree(parentId = null) {
  const sql = parentId === null
    ? 'SELECT id, parent_id, name, created_at, updated_at FROM `groups` WHERE parent_id IS NULL ORDER BY name ASC'
    : 'SELECT id, parent_id, name, created_at, updated_at FROM `groups` WHERE parent_id = ? ORDER BY name ASC';

  const params = parentId === null ? [] : [parentId];
  const groups = await query(sql, params);

  for (const group of groups) {
    group.children = await getGroupTree(group.id);
  }

  return groups;
}

/**
 * Get all groups with optional parent filter
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { parent_id } = req.query;

    let groups;

    // If fetching root groups, get full tree
    if (!parent_id || parent_id === 'null' || parent_id === '') {
      groups = await getGroupTree();
    } else {
      // Otherwise just get direct children
      const sql = 'SELECT id, parent_id, name, created_at, updated_at FROM `groups` WHERE parent_id = ? ORDER BY name ASC';
      groups = await query(sql, [parent_id]);
    }

    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * Get single group with its content
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get group details
    const groups = await query(
      'SELECT id, parent_id, name, created_at, updated_at FROM `groups` WHERE id = ?',
      [id]
    );

    if (!groups[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groups[0];

    // Get content in this group (excluding blocks)
    const content = await query(`
      SELECT c.id, c.module, c.slug, c.title
      FROM content c
      JOIN content_groups cg ON c.id = cg.content_id
      WHERE cg.group_id = ? AND c.module != 'blocks'
      ORDER BY c.title ASC
    `, [id]);

    // Get child groups
    const children = await query(
      'SELECT id, name FROM `groups` WHERE parent_id = ? ORDER BY name ASC',
      [id]
    );

    res.json({
      ...group,
      content,
      children
    });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

/**
 * Create a new group
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const result = await query(
      'INSERT INTO `groups` (parent_id, name) VALUES (?, ?)',
      [parent_id || null, name.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      parent_id: parent_id || null,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

/**
 * Update a group
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check if group exists
    const groups = await query('SELECT id FROM `groups` WHERE id = ?', [id]);
    if (!groups[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Prevent self-referential parent
    if (parent_id && parseInt(parent_id) === parseInt(id)) {
      return res.status(400).json({ error: 'A group cannot be its own parent' });
    }

    await query(
      'UPDATE `groups` SET name = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name.trim(), parent_id || null, id]
    );

    res.json({
      id: parseInt(id),
      parent_id: parent_id || null,
      name: name.trim(),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

/**
 * Delete a group
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group exists
    const groups = await query('SELECT id FROM `groups` WHERE id = ?', [id]);
    if (!groups[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await query('DELETE FROM `groups` WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

/**
 * Add content to a group
 */
router.post('/:id/content', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content_id } = req.body;

    if (!content_id) {
      return res.status(400).json({ error: 'Content ID is required' });
    }

    // Check if group exists
    const groups = await query('SELECT id FROM `groups` WHERE id = ?', [id]);
    if (!groups[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if content exists and is not a block
    const content = await query('SELECT id, module FROM content WHERE id = ?', [content_id]);
    if (!content[0]) {
      return res.status(404).json({ error: 'Content not found' });
    }
    if (content[0].module === 'blocks') {
      return res.status(400).json({ error: 'Blocks cannot belong to groups' });
    }

    // Add to group (ignore if already exists)
    await query(
      'INSERT IGNORE INTO content_groups (group_id, content_id) VALUES (?, ?)',
      [id, content_id]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error adding content to group:', err);
    res.status(500).json({ error: 'Failed to add content to group' });
  }
});

/**
 * Remove content from a group
 */
router.delete('/:id/content/:content_id', requireAuth, async (req, res) => {
  try {
    const { id, content_id } = req.params;

    const result = await query(
      'DELETE FROM content_groups WHERE group_id = ? AND content_id = ?',
      [id, content_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Content not in group' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing content from group:', err);
    res.status(500).json({ error: 'Failed to remove content from group' });
  }
});

/**
 * Get all groups (hierarchical with parent=null)
 */
router.get('/hierarchy', requireAuth, async (req, res) => {
  try {
    const groups = await query(`
      WITH RECURSIVE group_tree AS (
        SELECT id, parent_id, name, created_at, updated_at, 0 as level
        FROM \`groups\`
        WHERE parent_id IS NULL
        UNION ALL
        SELECT g.id, g.parent_id, g.name, g.created_at, g.updated_at, gt.level + 1
        FROM \`groups\` g
        JOIN group_tree gt ON g.parent_id = gt.id
      )
      SELECT * FROM group_tree
      ORDER BY level, name
    `);

    res.json(groups);
  } catch (err) {
    console.error('Error fetching group hierarchy:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * Get groups for a specific content
 */
router.get('/content/:content_id/groups', requireAuth, async (req, res) => {
  try {
    const { content_id } = req.params;

    // Verify content isn't a block
    const contentCheck = await query('SELECT module FROM content WHERE id = ?', [content_id]);
    if (contentCheck[0]?.module === 'blocks') {
      return res.status(400).json({ error: 'Blocks cannot belong to groups' });
    }

    const groups = await query(`
      SELECT g.id, g.parent_id, g.name
      FROM \`groups\` g
      JOIN content_groups cg ON g.id = cg.group_id
      WHERE cg.content_id = ?
      ORDER BY g.name ASC
    `, [content_id]);

    res.json(groups);
  } catch (err) {
    console.error('Error fetching content groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

export default router;
