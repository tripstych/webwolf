import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useContentTypes } from '../context/ContentTypesContext';
import {
  LayoutDashboard,
  FileText,
  Layers,
  Image,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  List,
  Boxes,
  BookOpen,
  Newspaper,
  Package,
  Users,
  Briefcase,
  Tag
} from 'lucide-react';

// Icon mapping for content types
const ICON_MAP = {
  'LayoutDashboard': LayoutDashboard,
  'FileText': FileText,
  'Boxes': Boxes,
  'BookOpen': BookOpen,
  'Newspaper': Newspaper,
  'Package': Package,
  'Users': Users,
  'Briefcase': Briefcase,
  'Layers': Layers,
  'Image': Image,
  'List': List,
  'Search': Search,
  'Settings': Settings
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { contentTypes } = useContentTypes();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Organize navigation by sections
  const navigationSections = [
    {
      section: null,
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard }
      ]
    },
    {
      section: 'Store',
      items: [
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Orders', href: '/orders', icon: Briefcase },
        { name: 'Customers', href: '/customers', icon: Users }
      ]
    },
    {
      section: 'Content',
      items: [
        { name: 'Pages', href: '/pages', icon: FileText },
        { name: 'Blocks', href: '/blocks', icon: Boxes },
        { name: 'Templates', href: '/templates', icon: Layers },
        { name: 'Media', href: '/media', icon: Image },
        { name: 'Menus', href: '/menus', icon: List },
        { name: 'Groups', href: '/groups', icon: Tag },
        ...contentTypes
          .filter(type => !['products', 'pages', 'blocks', 'shop', 'shops'].includes(type.name))
          .map(type => ({
            name: type.plural_label,
            href: `/${type.name}`,
            icon: ICON_MAP[type.icon] || FileText
          }))
      ]
    },
    {
      section: 'Settings',
      items: [
        { name: 'Users', href: '/users', icon: Users },
        { name: 'SEO', href: '/seo', icon: Search },
        { name: 'Configuration', href: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-gray-900">WebWolf CMS</span>
          </Link>
          <button
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          {navigationSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.section && (
                <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.section}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-sm">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.name || user?.email}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
