import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';
import MediaPicker from '../components/MediaPicker';
import {
  Save,
  ArrowLeft,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Image
} from 'lucide-react';

export default function PageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [seoOpen, setSeoOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState({
    template_id: '',
    title: '',
    slug: '',
    status: 'draft',
    content: {},
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots: 'index, follow'
  });

  const [regions, setRegions] = useState([]);

  useEffect(() => {
    loadTemplates();
    if (!isNew) {
      loadPage();
    }
  }, [id]);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates');
      setTemplates(data);
      if (isNew && data.length > 0) {
        setPage(p => ({ ...p, template_id: data[0].id }));
        setRegions(data[0].regions || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadPage = async () => {
    try {
      const data = await api.get(`/pages/${id}`);
      setPage({
        template_id: data.template_id,
        title: data.title,
        slug: data.slug,
        status: data.status,
        content: data.content || {},
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        og_title: data.og_title || '',
        og_description: data.og_description || '',
        og_image: data.og_image || '',
        canonical_url: data.canonical_url || '',
        robots: data.robots || 'index, follow'
      });
      setRegions(data.template_regions || []);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    setPage(p => ({ ...p, template_id: templateId }));
    setRegions(template?.regions || []);
  };

  const handleContentChange = (regionName, value) => {
    setPage(p => ({
      ...p,
      content: { ...p.content, [regionName]: value }
    }));
  };

  const handleRepeaterAdd = (regionName, fields) => {
    const newItem = {};
    fields.forEach(f => newItem[f.name] = '');
    setPage(p => ({
      ...p,
      content: {
        ...p.content,
        [regionName]: [...(p.content[regionName] || []), newItem]
      }
    }));
  };

  const handleRepeaterRemove = (regionName, index) => {
    setPage(p => ({
      ...p,
      content: {
        ...p.content,
        [regionName]: p.content[regionName].filter((_, i) => i !== index)
      }
    }));
  };

  const handleRepeaterChange = (regionName, index, fieldName, value) => {
    setPage(p => ({
      ...p,
      content: {
        ...p.content,
        [regionName]: p.content[regionName].map((item, i) =>
          i === index ? { ...item, [fieldName]: value } : item
        )
      }
    }));
  };

  const handleSave = async (newStatus) => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        ...page,
        status: newStatus || page.status
      };

      if (isNew) {
        const result = await api.post('/pages', payload);
        setSuccess('Page created successfully!');
        navigate(`/pages/${result.id}`, { replace: true });
      } else {
        await api.put(`/pages/${id}`, payload);
        setSuccess('Page saved successfully!');
        setPage(p => ({ ...p, status: newStatus || p.status }));
      }
    } catch (err) {
      setError(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media) => {
    if (mediaPickerTarget === 'og_image') {
      setPage(p => ({ ...p, og_image: media.url }));
    } else if (mediaPickerTarget.startsWith('content.')) {
      const regionName = mediaPickerTarget.replace('content.', '');
      handleContentChange(regionName, media.url);
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const renderField = (region) => {
    const value = page.content[region.name] || '';

    switch (region.type) {
      case 'richtext':
        return (
          <RichTextEditor
            value={value}
            onChange={(val) => handleContentChange(region.name, val)}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleContentChange(region.name, e.target.value)}
            className="input min-h-[100px]"
            placeholder={region.placeholder}
          />
        );

      case 'image':
        return (
          <div className="space-y-2">
            {value && (
              <img src={value} alt="" className="max-w-xs rounded-lg border" />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openMediaPicker(`content.${region.name}`)}
                className="btn btn-secondary"
              >
                <Image className="w-4 h-4 mr-2" />
                {value ? 'Change Image' : 'Select Image'}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => handleContentChange(region.name, '')}
                  className="btn btn-ghost text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        );

      case 'repeater':
        const items = page.content[region.name] || [];
        return (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRepeaterRemove(region.name, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {region.fields?.map((field) => (
                  <div key={field.name}>
                    <label className="label">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={item[field.name] || ''}
                        onChange={(e) => handleRepeaterChange(region.name, index, field.name, e.target.value)}
                        className="input"
                      />
                    ) : (
                      <input
                        type="text"
                        value={item[field.name] || ''}
                        onChange={(e) => handleRepeaterChange(region.name, index, field.name, e.target.value)}
                        className="input"
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleRepeaterAdd(region.name, region.fields || [])}
              className="btn btn-secondary w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleContentChange(region.name, e.target.value)}
            className="input"
            placeholder={region.placeholder}
          />
        );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pages')} className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'New Page' : 'Edit Page'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {page.status === 'published' && (
            <a
              href={page.slug}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </a>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="btn btn-secondary"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                value={page.title}
                onChange={(e) => setPage(p => ({ ...p, title: e.target.value }))}
                className="input"
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="label">URL Slug</label>
              <input
                type="text"
                value={page.slug}
                onChange={(e) => setPage(p => ({ ...p, slug: e.target.value }))}
                className="input"
                placeholder="/about-us"
              />
            </div>
          </div>

          {/* Content Regions */}
          {regions.length > 0 && (
            <div className="card p-6 space-y-6">
              <h2 className="font-semibold text-gray-900">Content</h2>
              {regions.map((region) => (
                <div key={region.name}>
                  <label className="label">
                    {region.label}
                    {region.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(region)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Template */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Template</label>
              <select
                value={page.template_id}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input"
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={page.status}
                onChange={(e) => setPage(p => ({ ...p, status: e.target.value }))}
                className="input"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* SEO */}
          <div className="card">
            <button
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-900">SEO Settings</span>
              {seoOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {seoOpen && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-4">
                <div>
                  <label className="label">Meta Title</label>
                  <input
                    type="text"
                    value={page.meta_title}
                    onChange={(e) => setPage(p => ({ ...p, meta_title: e.target.value }))}
                    className="input"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {page.meta_title.length}/60 characters
                  </p>
                </div>
                <div>
                  <label className="label">Meta Description</label>
                  <textarea
                    value={page.meta_description}
                    onChange={(e) => setPage(p => ({ ...p, meta_description: e.target.value }))}
                    className="input"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {page.meta_description.length}/160 characters
                  </p>
                </div>
                <div>
                  <label className="label">OG Image</label>
                  {page.og_image && (
                    <img src={page.og_image} alt="" className="max-w-full rounded-lg border mb-2" />
                  )}
                  <button
                    type="button"
                    onClick={() => openMediaPicker('og_image')}
                    className="btn btn-secondary w-full"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    {page.og_image ? 'Change' : 'Select'} OG Image
                  </button>
                </div>
                <div>
                  <label className="label">Robots</label>
                  <select
                    value={page.robots}
                    onChange={(e) => setPage(p => ({ ...p, robots: e.target.value }))}
                    className="input"
                  >
                    <option value="index, follow">Index, Follow</option>
                    <option value="noindex, follow">No Index, Follow</option>
                    <option value="index, nofollow">Index, No Follow</option>
                    <option value="noindex, nofollow">No Index, No Follow</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      {mediaPickerOpen && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
    </div>
  );
}
