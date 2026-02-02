import { useState, useEffect } from 'react';
import api from '../lib/api';
import { RefreshCw, Layers, FileText, ChevronRight, CheckCircle } from 'lucide-react';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates');
      setTemplates(data);
      setSelectedTemplate(data[0]);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await api.post('/templates/sync');
      setSyncMessage(result.message);
      loadTemplates();
    } catch (err) {
      setSyncMessage('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    setSyncMessage('');
    try {
      const result = await api.post('/templates/reload');
      setSyncMessage(result.message);
    } catch (err) {
      setSyncMessage('Reload failed: ' + err.message);
    } finally {
      setReloading(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleReload} disabled={reloading} className="btn btn-secondary">
            <RefreshCw className={`w-4 h-4 mr-2 ${reloading ? 'animate-spin' : ''}`} />
            {reloading ? 'Reloading...' : 'Reload Cache'}
          </button>
          <button onClick={handleSync} disabled={syncing} className="btn btn-primary">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Filesystem'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {syncMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="card divide-y divide-gray-200">
            {templates.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No templates found.</p>
                <p className="text-sm mt-2">
                  Click "Sync from Filesystem" to scan for Nunjucks templates.
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.filename}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {template.page_count || 0} pages
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Template Details */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate.name}
                </h2>
                <p className="text-gray-500 mt-1">{selectedTemplate.filename}</p>
                {selectedTemplate.description && (
                  <p className="text-gray-600 mt-2">{selectedTemplate.description}</p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Content Regions</h3>
                {selectedTemplate.regions?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTemplate.regions.map((region, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{region.label}</p>
                            <p className="text-sm text-gray-500">
                              <code className="bg-gray-200 px-1 rounded">{region.name}</code>
                              <span className="mx-2">•</span>
                              <span className="capitalize">{region.type}</span>
                              {region.required && (
                                <span className="text-red-500 ml-2">Required</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {region.type === 'repeater' && region.fields && (
                          <div className="mt-3 pl-4 border-l-2 border-gray-300">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                              Repeater Fields
                            </p>
                            <div className="space-y-1">
                              {region.fields.map((field, fi) => (
                                <p key={fi} className="text-sm text-gray-600">
                                  <span className="font-medium">{field.label}</span>
                                  <span className="text-gray-400"> ({field.type})</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No content regions defined. Add{' '}
                    <code className="bg-gray-100 px-1 rounded">data-cms-region</code>{' '}
                    attributes to your template.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Usage</h3>
                <p className="text-sm text-gray-600">
                  To define content regions in your Nunjucks template, use data attributes:
                </p>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
{`<div data-cms-region="hero_title" 
     data-cms-type="text" 
     data-cms-label="Hero Title">
  {{ content.hero_title }}
</div>`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a template to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
