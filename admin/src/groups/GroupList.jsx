import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export default function GroupList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups?parent_id=', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      setGroups(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch groups error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm('Are you sure? This will remove the group but keep its content.')) return;

    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete group');

      fetchGroups();
    } catch (err) {
      setError(err.message);
      console.error('Delete error:', err);
    }
  };

  const toggleExpanded = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const GroupItem = ({ group, level = 0 }) => {
    const hasChildren = group.children && group.children.length > 0;
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            marginBottom: '0.25rem',
            border: '1px solid #e5e7eb'
          }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(group.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex'
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div style={{ width: '16px' }} />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{group.name}</div>
            {group.content && group.content.length > 0 && (
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                {group.content.length} item{group.content.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate(`/groups/${group.id}`)}
              className="btn btn-sm btn-secondary"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteGroup(group.id)}
              className="btn btn-sm btn-ghost"
              style={{ color: '#ef4444' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {group.children.map(child => (
              <GroupItem key={child.id} group={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => navigate('/groups/new')}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Group
        </button>
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

      {/* Groups List */}
      {groups.length === 0 ? (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No groups yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          {groups.map(group => (
            <GroupItem key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
