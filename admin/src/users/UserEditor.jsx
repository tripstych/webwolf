import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export default function UserEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const [user, setUser] = useState({
    name: '',
    email: '',
    role: 'editor',
    password: ''
  });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isNew) {
      loadUser();
    }
  }, [id, isNew]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/auth/users/${id}`);
      setUser({
        ...data,
        password: '' // Don't load password
      });
      setError('');
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare payload
      const payload = {
        name: user.name,
        email: user.email,
        role: user.role
      };

      // Only include password if it's not empty (for new users, it's required)
      if (user.password) {
        payload.password = user.password;
      } else if (isNew) {
        setError('Password is required for new users');
        setSaving(false);
        return;
      }

      if (isNew) {
        await api.post('/auth/users', payload);
        setSuccess('User created successfully');
        setTimeout(() => navigate('/users'), 1500);
      } else {
        await api.put(`/auth/users/${id}`, payload);
        setSuccess('User updated successfully');
      }
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New User' : 'Edit User'}
        </h1>
      </div>

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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 pb-2 border-b border-gray-200">
            User Information
          </h2>

          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              className="input"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="label">Password {!isNew && '(leave blank to keep current)'}</label>
            <input
              type="password"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              className="input"
              placeholder={isNew ? 'Enter password' : ''}
              required={isNew}
            />
            {!isNew && (
              <p className="text-xs text-gray-500 mt-1">
                Only enter a password if you want to change it
              </p>
            )}
          </div>

          <div>
            <label className="label">Role *</label>
            <select
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
              className="input"
              required
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="editor">Editor (create & modify content)</option>
              <option value="admin">Admin (full access)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Viewers can only see content. Editors can create and modify content. Admins have full access including user management.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save User'}
          </button>
        </div>
      </form>
    </div>
  );
}
