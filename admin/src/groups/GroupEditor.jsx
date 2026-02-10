import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft, X, Plus } from 'lucide-react';

export default function GroupEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';

  const [group, setGroup] = useState({
    name: '',
    parent_id: ''
  });

  const [groupContent, setGroupContent] = useState([]);
  const [allContent, setAllContent] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchContent, setSearchContent] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all groups for parent selection
      const groupsRes = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setAllGroups(groupsData.data || groupsData || []);
      }

      // Load all content from database
      const contentRes = await fetch('/api/debug/all-content', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setAllContent(contentData.data || contentData || []);
      }

      // Load group if editing
      if (!isNew) {
        const groupRes = await fetch(`/api/groups/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!groupRes.ok) throw new Error('Failed to load group');

        const groupData = await groupRes.json();
        setGroup({
          name: groupData.name,
          parent_id: groupData.parent_id || ''
        });
        setGroupContent(groupData.content || []);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!group.name || !group.name.trim()) {
        setError('Group name is required');
        setSaving(false);
        return;
      }

      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/groups' : `/api/groups/${id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: group.name,
          parent_id: group.parent_id || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save group');
      }

      const saved = await response.json();
      navigate(`/groups/${saved.id}`);
    } catch (err) {
      setError(err.message);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addContentToGroup = async (contentId) => {
    try {
      const response = await fetch(`/api/groups/${id}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content_id: contentId })
      });

      if (!response.ok) throw new Error('Failed to add content');

      // Reload group to get updated content
      loadData();
      setSearchContent('');
    } catch (err) {
      setError(err.message);
      console.error('Add content error:', err);
    }
  };

  const removeContentFromGroup = async (contentId) => {
    try {
      const response = await fetch(`/api/groups/${id}/content/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to remove content');

      setGroupContent(groupContent.filter(c => c.id !== contentId));
    } catch (err) {
      setError(err.message);
      console.error('Remove content error:', err);
    }
  };

  // Filter available content (not already in group, exclude blocks)
  const contentInGroup = new Set(groupContent.map(c => c.id));
  const availableContent = allContent.filter(
    c => c.module !== 'blocks' &&
      !contentInGroup.has(c.id) &&
      (c.title || '').toLowerCase().includes(searchContent.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New Group' : group.name}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Group'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Group Details */}
      <div className="card p-6 space-y-4">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginTop: 0 }}>Group Details</h2>

        <div>
          <label className="label">Group Name *</label>
          <input
            type="text"
            value={group.name}
            onChange={(e) => setGroup({ ...group, name: e.target.value })}
            className="input"
            placeholder="e.g., Blog Posts, Products, Featured Content"
          />
        </div>

        <div>
          <label className="label">Parent Group (optional)</label>
          <select
            value={group.parent_id}
            onChange={(e) => setGroup({ ...group, parent_id: e.target.value })}
            className="input"
          >
            <option value="">None (top-level group)</option>
            {allGroups
              .filter(g => g.id !== id) // Don't allow self-reference
              .map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
            Make this group a child of another group to create a hierarchy
          </p>
        </div>
      </div>

      {/* Content Management */}
      {!isNew && (
        <div className="space-y-4">
          {/* Add Content */}
          <div className="card p-6">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginTop: 0, marginBottom: '1rem' }}>
              Add Content
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search content to add..."
                value={searchContent}
                onChange={(e) => setSearchContent(e.target.value)}
                className="input"
              />
            </div>

            {availableContent.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                {searchContent ? 'No matching content found' : 'All content is already in this group'}
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {availableContent.map(content => (
                  <div
                    key={content.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{content.title || 'Untitled'}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {content.slug}
                      </div>
                    </div>
                    <button
                      onClick={() => addContentToGroup(content.id)}
                      className="btn btn-sm btn-primary"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Content */}
          <div className="card p-6">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginTop: 0, marginBottom: '1rem' }}>
              Group Content ({groupContent.length})
            </h2>

            {groupContent.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                No content in this group yet. Add some above.
              </p>
            ) : (
              <div>
                {groupContent.map(content => (
                  <div
                    key={content.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{content.title || 'Untitled'}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {content.slug}
                      </div>
                    </div>
                    <button
                      onClick={() => removeContentFromGroup(content.id)}
                      className="btn btn-sm btn-ghost"
                      style={{ color: '#ef4444' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
