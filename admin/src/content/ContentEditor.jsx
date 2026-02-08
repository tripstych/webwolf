import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Save, ArrowLeft } from 'lucide-react';

export default function ContentEditor() {
  const { contentType: contentTypeName, id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [contentType, setContentType] = useState(null);
  const [item, setItem] = useState({
    template_id: '',
    title: '',
    slug: '',
    content: {},
    status: 'draft',
    meta_title: '',
    meta_description: ''
  });

  const endpoint = contentTypeName === 'blocks' ? '/blocks' : '/pages';

  useEffect(() => {
    loadContentType();
    loadTemplates();
    if (!isNew) {
      loadItem();
    }
  }, [id, contentTypeName]);

  const loadContentType = async () => {
    try {
      const data = await api.get(`/content-types/${contentTypeName}`);
      setContentType(data);
    } catch (err) {
      console.error('Failed to load content type:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await api.get(`/templates/content_type/${contentTypeName}`);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadItem = async () => {
    try {
      const data = await api.get(`${endpoint}/${id}`);
      setItem({
        template_id: data.template_id,
        title: data.title || data.name,
        slug: data.slug,
        content: data.content || {},
        status: data.status || 'draft',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || ''
      });
      setRegions(data.regions || []);
    } catch (err) {
      console.error('Failed to load item:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title) => {
    const slug = generateSlug(title);
    setItem(i => ({ ...i, title, slug }));
  };

  const handleTemplateChange = (templateId) => {
    const numId = parseInt(templateId);
    const template = templates.find(t => t.id === numId);
    setItem(i => ({ ...i, template_id: numId }));
    setRegions(template?.regions || []);
  };

  const handleContentChange = (regionName, value) => {
    setItem(i => ({
      ...i,
      content: { ...i.content, [regionName]: value }
    }));
  };

  const handleSave = async () => {
    if (!item.template_id) {
      alert('Please select a template');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...item,
        content_type: contentTypeName
      };

      if (isNew) {
        const result = await api.post(endpoint, payload);
        navigate(`/${contentTypeName}/${result.id}`, { replace: true });
      } else {
        await api.put(`${endpoint}/${id}`, payload);
        alert('Saved successfully!');
      }
    } catch (err) {
      alert('Failed to save');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !contentType) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/${contentTypeName}`)} className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">
            {isNew ? `New ${contentType.label}` : `Edit ${contentType.label}`}
          </h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                type="text"
                value={item.slug}
                onChange={(e) => setItem(i => ({ ...i, slug: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {/* Content Regions */}
          {regions.length > 0 && (
            <div className="card p-6 space-y-6">
              <h2 className="font-semibold text-gray-900">Content</h2>
              {regions.map((region) => (
                <div key={region.name}>
                  <label className="label">{region.label}</label>
                  {region.type === 'richtext' ? (
                    <textarea
                      value={item.content[region.name] || ''}
                      onChange={(e) => handleContentChange(region.name, e.target.value)}
                      className="input h-48"
                      placeholder="Enter rich text content..."
                    />
                  ) : region.type === 'textarea' ? (
                    <textarea
                      value={item.content[region.name] || ''}
                      onChange={(e) => handleContentChange(region.name, e.target.value)}
                      className="input h-32"
                      placeholder={region.placeholder || ''}
                    />
                  ) : (
                    <input
                      type="text"
                      value={item.content[region.name] || ''}
                      onChange={(e) => handleContentChange(region.name, e.target.value)}
                      className="input"
                      placeholder={region.placeholder || ''}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SEO Section (conditional) */}
          {contentType.has_seo && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">SEO</h2>
              <div>
                <label className="label">Meta Title</label>
                <input
                  type="text"
                  value={item.meta_title}
                  onChange={(e) => setItem(i => ({ ...i, meta_title: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Meta Description</label>
                <textarea
                  value={item.meta_description}
                  onChange={(e) => setItem(i => ({ ...i, meta_description: e.target.value }))}
                  className="input h-24"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Template */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Template</label>
              <select
                value={item.template_id || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input"
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (conditional) */}
          {contentType.has_status && (
            <div className="card p-6 space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => setItem(i => ({ ...i, status: e.target.value }))}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
