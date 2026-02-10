import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

export default function ContentGroupsWidget({ contentId, onGroupsChange }) {
  const [groups, setGroups] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (contentId) {
      loadContentGroups();
      loadAvailableGroups();
    }
  }, [contentId]);

  const loadContentGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/groups/content/${contentId}/groups`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.data || data || []);
      }
    } catch (err) {
      console.error('Error loading content groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableGroups(data.data || data || []);
      }
    } catch (err) {
      console.error('Error loading available groups:', err);
    }
  };

  const addGroupToContent = async (groupId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content_id: contentId })
      });

      if (response.ok) {
        await loadContentGroups();
        setSearchTerm('');
        setShowDropdown(false);
        if (onGroupsChange) onGroupsChange();
      }
    } catch (err) {
      console.error('Error adding group:', err);
    }
  };

  const removeGroupFromContent = async (groupId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/content/${contentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setGroups(groups.filter(g => g.id !== groupId));
        if (onGroupsChange) onGroupsChange();
      }
    } catch (err) {
      console.error('Error removing group:', err);
    }
  };

  // Get groups not already assigned
  const assignedGroupIds = new Set(groups.map(g => g.id));
  const flattenGroups = (groupList) => {
    let result = [];
    for (const group of groupList) {
      result.push(group);
      if (group.children && group.children.length > 0) {
        result = result.concat(flattenGroups(group.children));
      }
    }
    return result;
  };

  const allGroupsFlat = flattenGroups(availableGroups);
  const unassignedGroups = allGroupsFlat.filter(g => !assignedGroupIds.has(g.id));
  const filteredGroups = unassignedGroups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!contentId) {
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Save content first to add it to groups
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1.5rem'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 500 }}>
        Groups
      </h3>

      {/* Current Groups */}
      <div style={{ marginBottom: '1.5rem' }}>
        {groups.length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
            Not in any groups yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {groups.map(group => (
              <div
                key={group.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '9999px',
                  paddingLeft: '0.75rem',
                  paddingRight: '0.5rem',
                  paddingTop: '0.25rem',
                  paddingBottom: '0.25rem'
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  {group.name}
                </span>
                <button
                  onClick={() => removeGroupFromContent(group.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Remove from group"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Group Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          <Plus className="w-4 h-4" />
          {unassignedGroups.length > 0 ? 'Add to group' : 'All groups assigned'}
        </button>

        {showDropdown && unassignedGroups.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              marginTop: '0.25rem',
              zIndex: 10,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: 'none',
                borderBottom: '1px solid #e5e7eb',
                borderRadius: '4px 4px 0 0',
                fontSize: '0.875rem'
              }}
            />

            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {filteredGroups.length === 0 ? (
                <div style={{ padding: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                  No groups found
                </div>
              ) : (
                filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => addGroupToContent(group.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {group.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          onClick={() => setShowDropdown(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9
          }}
        />
      )}
    </div>
  );
}
