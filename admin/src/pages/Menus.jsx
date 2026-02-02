import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Plus,
  Trash2,
  Edit,
  GripVertical,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  X,
  Check,
  Menu as MenuIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function Menus() {
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newMenuName, setNewMenuName] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [newItem, setNewItem] = useState({
    title: '',
    url: '',
    page_id: null,
    target: '_self',
    linkType: 'page'
  });

  useEffect(() => {
    loadMenus();
    loadPages();
  }, []);

  const loadMenus = async () => {
    try {
      const data = await api.get('/menus');
      setMenus(data);
      if (data.length > 0 && !selectedMenu) {
        loadMenu(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load menus:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMenu = async (id) => {
    try {
      const menu = await api.get(`/menus/${id}`);
      setSelectedMenu(menu);
    } catch (err) {
      console.error('Failed to load menu:', err);
    }
  };

  const loadPages = async () => {
    try {
      const data = await api.get('/pages?status=published');
      const normalizedPages = Array.isArray(data) ? data : (data?.pages || []);
      setPages(normalizedPages);
    } catch (err) {
      console.error('Failed to load pages:', err);
    }
  };

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    try {
      const menu = await api.post('/menus', { name: newMenuName });
      setMenus([...menus, menu]);
      setSelectedMenu({ ...menu, items: [] });
      setNewMenuName('');
      setShowNewMenu(false);
    } catch (err) {
      alert('Failed to create menu: ' + err.message);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm('Delete this menu and all its items?')) return;
    try {
      await api.delete(`/menus/${id}`);
      setMenus(menus.filter(m => m.id !== id));
      if (selectedMenu?.id === id) {
        setSelectedMenu(null);
      }
    } catch (err) {
      alert('Failed to delete menu: ' + err.message);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim()) return;
    try {
      const itemData = {
        title: newItem.title,
        target: newItem.target,
        ...(newItem.linkType === 'page' 
          ? { page_id: newItem.page_id } 
          : { url: newItem.url })
      };
      await api.post(`/menus/${selectedMenu.id}/items`, itemData);
      loadMenu(selectedMenu.id);
      setNewItem({
        title: '',
        url: '',
        page_id: null,
        target: '_self',
        linkType: 'page'
      });
      setShowNewItem(false);
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    }
  };

  const handleUpdateItem = async (item) => {
    try {
      await api.put(`/menus/${selectedMenu.id}/items/${item.id}`, item);
      loadMenu(selectedMenu.id);
      setEditingItem(null);
    } catch (err) {
      alert('Failed to update item: ' + err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/menus/${selectedMenu.id}/items/${itemId}`);
      loadMenu(selectedMenu.id);
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  const handleReorderItem = async (itemId, direction) => {
    try {
      await api.put(`/menus/${selectedMenu.id}/items/${itemId}/reorder`, { direction });
      loadMenu(selectedMenu.id);
    } catch (err) {
      alert('Failed to reorder item: ' + err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMenuItem = (item, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id];
    const isEditing = editingItem?.id === item.id;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg mb-2 ${
            depth > 0 ? 'ml-8' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          
          {hasChildren && (
            <button onClick={() => toggleExpand(item.id)} className="p-1">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}

          {isEditing ? (
            <div className="flex-1 space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!editingItem.page_id}
                    onChange={() => setEditingItem({ ...editingItem, page_id: null, url: editingItem.url || '' })}
                  />
                  Custom URL
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!!editingItem.page_id}
                    onChange={() => setEditingItem({ ...editingItem, url: null, page_id: editingItem.page_id || pages[0]?.id || null })}
                  />
                  Page
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="input flex-1"
                  placeholder="Title"
                />
                {!editingItem.page_id ? (
                  <input
                    type="text"
                    value={editingItem.url || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                    className="input flex-1"
                    placeholder="https://..."
                  />
                ) : (
                  <select
                    value={editingItem.page_id || ''}
                    onChange={(e) => {
                      const pageId = e.target.value || null;
                      setEditingItem({ ...editingItem, page_id: pageId });
                    }}
                    className="input flex-1"
                  >
                    <option value="">Select a page</option>
                    {pages.map(page => (
                      <option key={page.id} value={page.id}>{page.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingItem.target === '_blank'}
                    onChange={(e) => setEditingItem({ ...editingItem, target: e.target.checked ? '_blank' : '_self' })}
                  />
                  Open in new tab
                </label>
                <button onClick={() => handleUpdateItem(editingItem)} className="p-1 text-green-600 ml-auto">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingItem(null)} className="p-1 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {item.page_id ? (
                    <>
                      <FileText className="w-3 h-3" />
                      {item.page_title || 'Page'}
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3 h-3" />
                      {item.url || '#'}
                    </>
                  )}
                  {item.target === '_blank' && (
                    <ExternalLink className="w-3 h-3 ml-1" />
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditingItem({ ...item })}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReorderItem(item.id, 'up')}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Move up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReorderItem(item.id, 'down')}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Move down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children.map(child => renderMenuItem(child, depth + 1))}
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
        <button onClick={() => setShowNewMenu(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Menu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu List */}
        <div className="lg:col-span-1">
          <div className="card divide-y divide-gray-200">
            {menus.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MenuIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No menus yet</p>
              </div>
            ) : (
              menus.map((menu) => (
                <div
                  key={menu.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    selectedMenu?.id === menu.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => loadMenu(menu.id)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{menu.name}</p>
                    <p className="text-xs text-gray-500">{menu.item_count || 0} items</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMenu(menu.id);
                    }}
                    className="p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-3">
          {selectedMenu ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedMenu.name}</h2>
                  <p className="text-sm text-gray-500">Slug: {selectedMenu.slug}</p>
                </div>
                <button
                  onClick={() => {
                    setNewItem({
                      title: '',
                      url: '',
                      page_id: null,
                      target: '_self',
                      linkType: 'page'
                    });
                    setShowNewItem(true);
                  }}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </button>
              </div>

              {/* Add Item Form */}
              {showNewItem && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newItem.linkType === 'custom'}
                        onChange={() => setNewItem({ ...newItem, linkType: 'custom', page_id: null })}
                      />
                      Custom URL
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newItem.linkType === 'page'}
                        onChange={() => setNewItem({ ...newItem, linkType: 'page', url: '' })}
                      />
                      Page
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Title</label>
                      <input
                        type="text"
                        value={newItem.title}
                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        className="input"
                        placeholder="Menu item title"
                      />
                    </div>

                    {newItem.linkType === 'custom' ? (
                      <div>
                        <label className="label">URL</label>
                        <input
                          type="text"
                          value={newItem.url}
                          onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                          className="input"
                          placeholder="https://..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="label">Page</label>
                        <select
                          value={newItem.page_id || ''}
                          onChange={(e) => {
                            const pageId = e.target.value || null;
                            const selectedPage = pages.find(p => String(p.id) === String(pageId));
                            setNewItem(curr => ({
                              ...curr,
                              page_id: pageId,
                              title: curr.title?.trim() ? curr.title : (selectedPage?.title || '')
                            }));
                          }}
                          className="input"
                        >
                          <option value="">Select a page</option>
                          {pages.map(page => (
                            <option key={page.id} value={page.id}>{page.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newItem.target === '_blank'}
                        onChange={(e) => setNewItem({ ...newItem, target: e.target.checked ? '_blank' : '_self' })}
                      />
                      Open in new tab
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleAddItem} className="btn btn-primary">
                      Add Item
                    </button>
                    <button onClick={() => setShowNewItem(false)} className="btn btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Menu Items List */}
              {selectedMenu.items?.length > 0 ? (
                <div>
                  {selectedMenu.items.map(item => renderMenuItem(item))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No items in this menu</p>
                  <p className="text-sm mt-1">Click "Add Item" to get started</p>
                </div>
              )}

              {/* Usage Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Usage in Templates</h3>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
{`{% set menu = getMenu('${selectedMenu.slug}') %}
{% for item in menu.items %}
  <a href="{{ item.url }}" target="{{ item.target }}">
    {{ item.title }}
  </a>
{% endfor %}`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <MenuIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a menu to edit its items</p>
            </div>
          )}
        </div>
      </div>

      {/* New Menu Modal */}
      {showNewMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Menu</h3>
            <div className="mb-4">
              <label className="label">Menu Name</label>
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                className="input"
                placeholder="e.g., Main Navigation"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewMenu(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={handleCreateMenu} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
