import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ContentList() {
  const { contentType: contentTypeName } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contentType, setContentType] = useState(null);

  // Determine endpoint based on content type
  const endpoint = contentTypeName === 'blocks' ? '/blocks' : '/pages';

  useEffect(() => {
    loadContentType();
    loadItems();
  }, [contentTypeName, statusFilter]);

  const loadContentType = async () => {
    try {
      const data = await api.get(`/content-types/${contentTypeName}`);
      setContentType(data);
    } catch (err) {
      console.error('Failed to load content type:', err);
    }
  };

  const loadItems = async () => {
    try {
      const params = { content_type: contentTypeName };
      if (statusFilter !== 'all' && contentType?.has_status) {
        params.status = statusFilter;
      }

      const data = await api.get(endpoint, params);
      setItems(data.data || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete this ${contentType?.label}?`)) return;

    try {
      await api.delete(`${endpoint}/${id}`);
      loadItems();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const filteredItems = items.filter(item =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !contentType) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{contentType.plural_label}</h1>
        <Link to={`/${contentTypeName}/new`} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New {contentType.label}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1"
        />

        {contentType.has_status && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-48"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      {/* List */}
      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4">Title</th>
              <th className="text-left p-4">Template</th>
              {contentType.has_status && <th className="text-left p-4">Status</th>}
              <th className="text-left p-4">Updated</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{item.title || item.name}</div>
                  <div className="text-sm text-gray-500">{item.slug}</div>
                </td>
                <td className="p-4 text-gray-600">{item.template_name}</td>
                {contentType.has_status && (
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'published' ? 'bg-green-100 text-green-800' :
                      item.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                )}
                <td className="p-4 text-gray-600 text-sm">
                  {new Date(item.updated_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/${contentTypeName}/${item.id}`} className="btn btn-ghost btn-sm">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-ghost btn-sm text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
