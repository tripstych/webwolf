import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function SEO() {
  const [redirects, setRedirects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newRedirect, setNewRedirect] = useState({
    source_path: '',
    target_path: '',
    status_code: 301
  });

  useEffect(() => {
    loadRedirects();
  }, []);

  const loadRedirects = async () => {
    try {
      const data = await api.get('/seo/redirects');
      setRedirects(data);
    } catch (err) {
      console.error('Failed to load redirects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRedirect = async () => {
    if (!newRedirect.source_path || !newRedirect.target_path) {
      setError('Source and target paths are required');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await api.post('/seo/redirects', newRedirect);
      setNewRedirect({ source_path: '', target_path: '', status_code: 301 });
      setSuccess('Redirect added successfully');
      loadRedirects();
    } catch (err) {
      setError(err.message || 'Failed to add redirect');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRedirect = async (id) => {
    if (!confirm('Are you sure you want to delete this redirect?')) return;
    try {
      await api.delete(`/seo/redirects/${id}`);
      loadRedirects();
    } catch (err) {
      setError('Failed to delete redirect');
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redirects */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Redirects</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage URL redirects for moved or deleted pages
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Add new redirect */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Source Path</label>
                  <input
                    type="text"
                    value={newRedirect.source_path}
                    onChange={(e) =>
                      setNewRedirect({ ...newRedirect, source_path: e.target.value })
                    }
                    className="input"
                    placeholder="/old-page"
                  />
                </div>
                <div>
                  <label className="label">Target Path</label>
                  <input
                    type="text"
                    value={newRedirect.target_path}
                    onChange={(e) =>
                      setNewRedirect({ ...newRedirect, target_path: e.target.value })
                    }
                    className="input"
                    placeholder="/new-page"
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-32">
                  <label className="label">Status</label>
                  <select
                    value={newRedirect.status_code}
                    onChange={(e) =>
                      setNewRedirect({
                        ...newRedirect,
                        status_code: parseInt(e.target.value)
                      })
                    }
                    className="input"
                  >
                    <option value={301}>301 (Permanent)</option>
                    <option value={302}>302 (Temporary)</option>
                  </select>
                </div>
                <button
                  onClick={handleAddRedirect}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Redirects list */}
            <div className="divide-y divide-gray-200">
              {redirects.length === 0 ? (
                <p className="py-4 text-center text-gray-500 text-sm">
                  No redirects configured
                </p>
              ) : (
                redirects.map((redirect) => (
                  <div
                    key={redirect.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <code className="bg-gray-100 px-2 py-1 rounded truncate">
                        {redirect.source_path}
                      </code>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <code className="bg-gray-100 px-2 py-1 rounded truncate">
                        {redirect.target_path}
                      </code>
                      <span className="text-xs text-gray-400">
                        ({redirect.status_code})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRedirect(redirect.id)}
                      className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">SEO Resources</h2>
            <div className="space-y-3">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">Sitemap</p>
                  <p className="text-sm text-gray-500">/sitemap.xml</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">Robots.txt</p>
                  <p className="text-sm text-gray-500">/robots.txt</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">SEO Best Practices</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Keep meta titles under 60 characters
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Meta descriptions should be 120-160 characters
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Use descriptive, keyword-rich URLs
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Add Open Graph images for social sharing
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Set up 301 redirects for moved content
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
