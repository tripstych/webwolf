import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    site_name: '',
    site_tagline: '',
    site_url: '',
    default_meta_title: '',
    default_meta_description: '',
    google_analytics_id: '',
    robots_txt: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.get('/settings');
      setSettings({
        site_name: data.site_name || '',
        site_tagline: data.site_tagline || '',
        site_url: data.site_url || '',
        default_meta_title: data.default_meta_title || '',
        default_meta_description: data.default_meta_description || '',
        google_analytics_id: data.google_analytics_id || '',
        robots_txt: data.robots_txt || 'User-agent: *\nAllow: /'
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put('/settings', settings);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* General Settings */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 pb-2 border-b border-gray-200">
          General
        </h2>

        <div>
          <label className="label">Site Name</label>
          <input
            type="text"
            value={settings.site_name}
            onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
            className="input"
            placeholder="My Website"
          />
        </div>

        <div>
          <label className="label">Site Tagline</label>
          <input
            type="text"
            value={settings.site_tagline}
            onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })}
            className="input"
            placeholder="Just another awesome website"
          />
        </div>

        <div>
          <label className="label">Site URL</label>
          <input
            type="url"
            value={settings.site_url}
            onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
            className="input"
            placeholder="https://example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used for sitemap generation and canonical URLs
          </p>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 pb-2 border-b border-gray-200">
          Default SEO
        </h2>

        <div>
          <label className="label">Default Meta Title</label>
          <input
            type="text"
            value={settings.default_meta_title}
            onChange={(e) =>
              setSettings({ ...settings, default_meta_title: e.target.value })
            }
            className="input"
            placeholder="Default page title"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used when pages don't have a custom meta title
          </p>
        </div>

        <div>
          <label className="label">Default Meta Description</label>
          <textarea
            value={settings.default_meta_description}
            onChange={(e) =>
              setSettings({ ...settings, default_meta_description: e.target.value })
            }
            className="input"
            rows={3}
            placeholder="Default description for search engines"
          />
        </div>

        <div>
          <label className="label">Robots.txt Content</label>
          <textarea
            value={settings.robots_txt}
            onChange={(e) => setSettings({ ...settings, robots_txt: e.target.value })}
            className="input font-mono text-sm"
            rows={6}
            placeholder="User-agent: *\nAllow: /"
          />
        </div>
      </div>

      {/* Analytics */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 pb-2 border-b border-gray-200">
          Analytics
        </h2>

        <div>
          <label className="label">Google Analytics ID</label>
          <input
            type="text"
            value={settings.google_analytics_id}
            onChange={(e) =>
              setSettings({ ...settings, google_analytics_id: e.target.value })
            }
            className="input"
            placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to disable Google Analytics
          </p>
        </div>
      </div>
    </div>
  );
}
