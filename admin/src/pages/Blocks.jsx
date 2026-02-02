import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';

export default function Blocks() {
  const [blocks, setBlocks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regions, setRegions] = useState([]);

  const [newBlock, setNewBlock] = useState({
    template_id: '',
    name: '',
    description: ''
  });

  const [editBlock, setEditBlock] = useState(null);

  useEffect(() => {
    loadBlocks();
    loadTemplates();
  }, []);

  const loadBlocks = async () => {
    try {
      const data = await api.get('/blocks');
      setBlocks(data);
      if (data.length > 0 && !selectedBlock) {
        loadBlock(data[0].id);
      }
    } catch (err) {
      setError('Failed to load blocks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBlock = async (id) => {
    try {
      const data = await api.get(`/blocks/${id}`);
      setSelectedBlock(data);
      setEditBlock({ ...data, content: data.content || {} });
      setRegions(data.regions || []);
    } catch (err) {
      setError('Failed to load block');
      console.error(err);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleCreateBlock = async () => {
    setError('');
    setSuccess('');

    if (!newBlock.name.trim() || !newBlock.template_id) {
      setError('Name and template are required');
      return;
    }

    setSaving(true);
    try {
      const block = await api.post('/blocks', {
        ...newBlock,
        content: {}
      });
      setBlocks([...blocks, block]);
      setSelectedBlock(block);
      setEditBlock({ ...block, content: block.content || {} });
      setRegions(templates.find(t => t.id === parseInt(block.template_id))?.regions || []);
      setNewBlock({ template_id: '', name: '', description: '' });
      setShowNew(false);
      setSuccess('Block created successfully!');
    } catch (err) {
      setError(err.message || 'Failed to create block');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBlock = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put(`/blocks/${selectedBlock.id}`, editBlock);
      setSelectedBlock(editBlock);
      setBlocks(blocks.map(b => b.id === editBlock.id ? editBlock : b));
      setSuccess('Block saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save block');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    if (!confirm('Delete this block?')) return;

    try {
      await api.delete(`/blocks/${id}`);
      setBlocks(blocks.filter(b => b.id !== id));
      if (selectedBlock?.id === id) {
        setSelectedBlock(null);
      }
      setSuccess('Block deleted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to delete block');
    }
  };

  const handleContentChange = (regionName, value) => {
    setEditBlock(b => ({
      ...b,
      content: { ...b.content, [regionName]: value }
    }));
  };

  const renderField = (region) => {
    const value = editBlock.content[region.name] || '';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blocks</h1>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Block
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Block List */}
        <div className="lg:col-span-1">
          <div className="card divide-y divide-gray-200">
            {blocks.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No blocks yet</p>
              </div>
            ) : (
              blocks.map((block) => (
                <button
                  key={block.id}
                  onClick={() => loadBlock(block.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                    selectedBlock?.id === block.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{block.name}</p>
                  <p className="text-xs text-gray-500">{block.template_name}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Block Details */}
        <div className="lg:col-span-3">
          {selectedBlock ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="card p-6 space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={editBlock.name}
                    onChange={(e) => setEditBlock(b => ({ ...b, name: e.target.value }))}
                    className="input"
                    placeholder="Block name"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={editBlock.description || ''}
                    onChange={(e) => setEditBlock(b => ({ ...b, description: e.target.value }))}
                    className="input min-h-[80px]"
                    placeholder="Block description"
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

              {/* Actions */}
              <div className="flex gap-2 justify-between">
                <button
                  onClick={() => handleDeleteBlock(selectedBlock.id)}
                  className="btn btn-ghost text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
                <button
                  onClick={handleSaveBlock}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Block'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <p>Select a block to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* New Block Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Create New Block</h3>

            <div>
              <label className="label">Block Name</label>
              <input
                type="text"
                value={newBlock.name}
                onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                className="input"
                placeholder="e.g., Hero Section"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Template</label>
              <select
                value={newBlock.template_id || ''}
                onChange={(e) => setNewBlock({ ...newBlock, template_id: e.target.value })}
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
              <label className="label">Description (optional)</label>
              <textarea
                value={newBlock.description}
                onChange={(e) => setNewBlock({ ...newBlock, description: e.target.value })}
                className="input min-h-[80px]"
                placeholder="What is this block for?"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNew(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBlock}
                disabled={saving}
                className="btn btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
