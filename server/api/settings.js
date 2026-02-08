import { Router } from 'express';
import { query } from '../db/connection.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get public settings (no auth required)
// These are settings that are safe to expose to the frontend
router.get('/public', async (req, res) => {
  try {
    const settings = await query('SELECT setting_key, setting_value FROM settings');

    // Only expose safe settings
    const publicSettings = {};
    const safeKeys = ['stripe_public_key', 'site_name', 'site_tagline', 'site_url', 'google_analytics_id'];

    settings.forEach(s => {
      if (safeKeys.includes(s.setting_key)) {
        publicSettings[s.setting_key] = s.setting_value;
      }
    });

    res.json(publicSettings);
  } catch (err) {
    console.error('Get public settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get all settings (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await query('SELECT setting_key, setting_value FROM settings');
    
    // Convert to object
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });
    
    res.json(settingsObj);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get single setting
router.get('/:key', requireAuth, async (req, res) => {
  try {
    const settings = await query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [req.params.key]
    );
    
    if (!settings[0]) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ key: req.params.key, value: settings[0].setting_value });
  } catch (err) {
    console.error('Get setting error:', err);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Update settings (batch)
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update single setting
router.put('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    
    await query(
      `INSERT INTO settings (setting_key, setting_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [req.params.key, value]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Delete setting
router.delete('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM settings WHERE setting_key = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete setting error:', err);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
