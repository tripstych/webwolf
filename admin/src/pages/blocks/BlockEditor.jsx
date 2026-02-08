import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';
import slugify from 'slugify';
import RichTextEditor from '../components/RichTextEditor';
import MediaPicker from '../components/MediaPicker';
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Image,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';

export default function BlockEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isSlugLocked, setIsSlugLocked] = useState(!isNew);

  const [block, setBlock] = useState({
    template_id: '',
    name: '',
    slug: '',
    content: {}
  });

  const [regions, setRegions] = useState([]);

  useEffect(() => {
    loadTemplates();
    if (!isNew) {
      loadBlock();
    }
  }, [id]);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates/content_type/blocks/list');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const syncTemplates = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/templates/sync');
      await loadTemplates();
      setSuccess('Templates synced successfully!');
    } catch (err) {
      setError(err.message || 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  };

  const loadBlock = async () => {
    try {
      const data = await api.get(`/blocks/${id}`);
      setBlock({
        template_id: data.template_id,
        name: data.name,
        slug: data.slug,
        content: data.content || {}
      });
      setRegions(data.regions || []);
    } catch (err) {
      console.error('Failed to load block:', err);
      setError('Failed to load block');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name) => {
    if (isSlugLocked) {
      // When locked, only update name
      setBlock(b => ({ ...b, name }));
    } else {
      // When unlocked, auto-generate slug
      const slug = slugify(name, { lower: true, strict: true });
      setBlock(b => ({ ...b, name, slug }));
    }
  };

  const handleToggleLock = () => {
    if (isSlugLocked) {
      // Show warning toast when unlocking
      toast.warning('Templates will now access the block using the updated slug. Ensure any pages using this block are working as intended!', {
        duration: 6000,
      });
    }
    setIsSlugLocked(!isSlugLocked);
  };

  const handleTemplateChange = (templateId) => {
    const numId = parseInt(templateId);
    const template = templates.find(t => t.id === numId);
    setBlock(b => ({ ...b, template_id: numId }));
    setRegions(template?.regions || []);
  };

  const handleContentChange = (regionName, value) => {
    setBlock(b => ({
      ...b,
      content: { ...b.content, [regionName]: value }
    }));
  };

  const handleRepeaterAdd = (regionName, fields) => {
    const newItem = {};
    fields.forEach(f => newItem[f.name] = '');
    setBlock(b => ({
      ...b,
      content: {
        ...b.content,
        [regionName]: [...(b.content[regionName] || []), newItem]
      }
    }));
  };

  const handleRepeaterRemove = (regionName, index) => {
    setBlock(b => ({
      ...b,
      content: {
        ...b.content,
        [regionName]: b.content[regionName].filter((_, i) => i !== index)
      }
    }));
  };

  const handleRepeaterChange = (regionName, index, fieldName, value) => {
    setBlock(b => ({
      ...b,
      content: {
        ...b.content,
        [regionName]: b.content[regionName].map((item, i) =>
          i === index ? { ...item, [fieldName]: value } : item
        )
      }
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (isNew) {
        const result = await api.post('/blocks', block);
        setSuccess('Block created successfully!');
        navigate(`/blocks/${result.id}`, { replace: true });
      } else {
        await api.put(`/blocks/${id}`, block);
        setSuccess('Block saved successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to save block');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this block?')) return;
    setSaving(true);
    try {
      await api.delete(`/blocks/${id}`);
      navigate('/blocks');
    } catch (err) {
      setError(err.message || 'Failed to delete block');
      setSaving(false);
    }
  };

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media) => {
    if (mediaPickerTarget.startsWith('content.')) {
      const remainder = mediaPickerTarget.replace('content.', '');
      const parts = remainder.split('.');
      if (parts.length === 1) {
        const regionName = parts[0];
        handleContentChange(regionName, media.url);
      } else if (parts.length === 3) {
        const [regionName, indexStr, fieldName] = parts;
        const index = Number.parseInt(indexStr, 10);
        if (Number.isFinite(index)) {
          handleRepeaterChange(regionName, index, fieldName, media.url);
        }
      }
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const renderField = (region) => {
    const value = block.content[region.name] || '';

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
        const items = block.content[region.name] || [];
        const explicitFields = Array.isArray(region.fields) && region.fields.length > 0 ? region.fields : null;
        const inferredFields = !explicitFields && items[0] && typeof items[0] === 'object' && !Array.isArray(items[0])
          ? Object.keys(items[0])
              .filter((key) => key !== 'id')
              .map((name) => ({
                name,
                label: name
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase()),
                type: (() => {
                  const n = name.toLowerCase();
                  if (n.includes('description')) return 'textarea';
                  if (n.includes('image') || n === 'src' || n.endsWith('_src') || n.endsWith('-src')) return 'image';
                  return 'text';
                })()
              }))
          : null;
        const fields = explicitFields || inferredFields || [];
        return (
          <div className="space-y-4">
            {!explicitFields && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {inferredFields
                  ? 'Repeater field schema missing for this template. Showing fields inferred from existing data.'
                  : 'Repeater field schema missing for this template. Sync templates from filesystem to restore field definitions.'}
              </div>
            )}
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
                {fields.map((field) => (
                  <div key={field.name}>
                    <label className="label">{field.label}</label>
                    {field.type === 'image' ? (
                      <div className="space-y-2">
                        {item[field.name] && (
                          <img src={item[field.name]} alt="" className="max-w-xs rounded-lg border" />
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openMediaPicker(`content.${region.name}.${index}.${field.name}`)}
                            className="btn btn-secondary"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            {item[field.name] ? 'Change Image' : 'Select Image'}
                          </button>
                          {item[field.name] && (
                            <button
                              type="button"
                              onClick={() => handleRepeaterChange(region.name, index, field.name, '')}
                              className="btn btn-ghost text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ) : field.type === 'textarea' ? (
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
              onClick={() => handleRepeaterAdd(region.name, fields)}
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
          <button onClick={() => navigate('/blocks')} className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'New Block' : 'Edit Block'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="btn btn-ghost text-red-600"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900">Block Identity</h2>
              <button
                type="button"
                onClick={handleToggleLock}
                className="btn btn-ghost px-3"
                title={isSlugLocked ? 'Unlock to edit name and slug' : 'Lock to prevent accidental changes'}
              >
                {isSlugLocked ? (
                  <Lock className="w-4 h-4 text-gray-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-amber-600" />
                )}
              </button>
            </div>

            <div>
              <label className="label">
                Name
                {isSlugLocked && (
                  <span className="ml-2 text-xs text-gray-500">(locked)</span>
                )}
              </label>
              <input
                type="text"
                value={block.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input"
                placeholder="Block name"
                disabled={isSlugLocked}
              />
            </div>

            <div>
              <label className="label">
                Slug
                {isSlugLocked && (
                  <span className="ml-2 text-xs text-gray-500">(locked)</span>
                )}
              </label>
              <input
                type="text"
                value={block.slug}
                onChange={(e) => setBlock(b => ({ ...b, slug: e.target.value }))}
                className="input"
                placeholder="block-slug"
                disabled={isSlugLocked}
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
          {/* Template */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Template</label>
              <div className="flex gap-2">
                <select
                  value={block.template_id || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input flex-1"
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={syncTemplates}
                  disabled={syncing}
                  className="btn btn-ghost px-3"
                  title="Sync templates from filesystem"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
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
