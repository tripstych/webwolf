import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import registry from '../services/extensionRegistry.js';

const router = Router();

// List all available extensions
router.get('/', requireAuth, (req, res) => {
  try {
    const extensions = Array.from(registry.getAllExtensions().values());
    res.json(extensions);
  } catch (err) {
    console.error('List extensions error:', err);
    res.status(500).json({ error: 'Failed to list extensions' });
  }
});

// Get extension details
router.get('/:extensionName', requireAuth, (req, res) => {
  try {
    const ext = registry.getExtension(req.params.extensionName);
    if (!ext) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    res.json(ext);
  } catch (err) {
    console.error('Get extension error:', err);
    res.status(500).json({ error: 'Failed to get extension' });
  }
});

// Get extensions enabled for a content type
router.get('/content-type/:contentTypeName', requireAuth, async (req, res) => {
  try {
    const { contentTypeName } = req.params;

    // Verify content type exists
    const contentTypes = await query(
      'SELECT id FROM content_types WHERE name = ?',
      [contentTypeName]
    );
    if (!contentTypes[0]) {
      return res.status(404).json({ error: 'Content type not found' });
    }

    // Get enabled extensions
    const extensions = await query(
      'SELECT extension_name, config FROM content_type_extensions WHERE content_type_name = ? AND enabled = TRUE',
      [contentTypeName]
    );

    const result = extensions.map(ext => ({
      name: ext.extension_name,
      config: ext.config ? JSON.parse(ext.config) : {}
    }));

    res.json(result);
  } catch (err) {
    console.error('Get content type extensions error:', err);
    res.status(500).json({ error: 'Failed to get extensions' });
  }
});

// Enable extension for content type
router.post('/:extensionName/enable', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { extensionName } = req.params;
    const { contentTypeName, config } = req.body;

    if (!contentTypeName) {
      return res.status(400).json({ error: 'Content type name required' });
    }

    // Verify extension is registered
    if (!registry.getExtension(extensionName)) {
      return res.status(404).json({ error: 'Extension not found' });
    }

    // Verify content type exists
    const contentTypes = await query(
      'SELECT id FROM content_types WHERE name = ?',
      [contentTypeName]
    );
    if (!contentTypes[0]) {
      return res.status(404).json({ error: 'Content type not found' });
    }

    // Insert or update extension
    await query(
      `INSERT INTO content_type_extensions (content_type_name, extension_name, config, enabled)
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE config = ?, enabled = TRUE`,
      [contentTypeName, extensionName, JSON.stringify(config || {}), JSON.stringify(config || {})]
    );

    res.status(201).json({
      message: `Extension "${extensionName}" enabled for "${contentTypeName}"`,
      extension: extensionName,
      contentType: contentTypeName
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Extension already enabled' });
    }
    console.error('Enable extension error:', err);
    res.status(500).json({ error: 'Failed to enable extension' });
  }
});

// Disable extension for content type
router.post('/:extensionName/disable', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { extensionName } = req.params;
    const { contentTypeName } = req.body;

    if (!contentTypeName) {
      return res.status(400).json({ error: 'Content type name required' });
    }

    const result = await query(
      'UPDATE content_type_extensions SET enabled = FALSE WHERE content_type_name = ? AND extension_name = ?',
      [contentTypeName, extensionName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Extension not found for this content type' });
    }

    res.json({
      message: `Extension "${extensionName}" disabled for "${contentTypeName}"`,
      extension: extensionName,
      contentType: contentTypeName
    });
  } catch (err) {
    console.error('Disable extension error:', err);
    res.status(500).json({ error: 'Failed to disable extension' });
  }
});

// Update extension configuration
router.put('/:extensionName/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { extensionName } = req.params;
    const { contentTypeName, config } = req.body;

    if (!contentTypeName) {
      return res.status(400).json({ error: 'Content type name required' });
    }

    const result = await query(
      'UPDATE content_type_extensions SET config = ? WHERE content_type_name = ? AND extension_name = ?',
      [JSON.stringify(config || {}), contentTypeName, extensionName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Extension not found for this content type' });
    }

    res.json({
      message: 'Extension configuration updated',
      extension: extensionName,
      contentType: contentTypeName,
      config
    });
  } catch (err) {
    console.error('Update extension config error:', err);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;
