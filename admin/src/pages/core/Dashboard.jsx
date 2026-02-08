import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { FileText, Layers, Image, Plus, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    pages: { total: 0, published: 0, draft: 0 },
    templates: 0,
    media: 0
  });
  const [recentPages, setRecentPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [pages, templates, media] = await Promise.all([
        api.get('/pages'),
        api.get('/templates'),
        api.get('/media?limit=1')
      ]);

      setStats({
        pages: {
          total: pages.length,
          published: pages.filter(p => p.status === 'published').length,
          draft: pages.filter(p => p.status === 'draft').length
        },
        templates: templates.length,
        media: media.pagination?.total || 0
      });

      setRecentPages(pages.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/pages/new" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pages.total}</p>
              <p className="text-xs text-gray-500">
                {stats.pages.published} published, {stats.pages.draft} drafts
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Templates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.templates}</p>
              <p className="text-xs text-gray-500">Available templates</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Image className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Media Files</p>
              <p className="text-2xl font-bold text-gray-900">{stats.media}</p>
              <p className="text-xs text-gray-500">Uploaded files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Pages */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Pages</h2>
          <Link to="/pages" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {recentPages.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No pages yet.{' '}
              <Link to="/pages/new" className="text-primary-600 hover:underline">
                Create your first page
              </Link>
            </div>
          ) : (
            recentPages.map((page) => (
              <Link
                key={page.id}
                to={`/pages/${page.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{page.title}</p>
                  <p className="text-sm text-gray-500">{page.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      page.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : page.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {page.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/templates" className="card p-6 hover:border-primary-300 transition-colors group">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
            Manage Templates
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            View and sync Nunjucks templates from the filesystem
          </p>
        </Link>
        <Link to="/seo" className="card p-6 hover:border-primary-300 transition-colors group">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
            SEO Settings
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage redirects, sitemaps, and robots.txt
          </p>
        </Link>
      </div>
    </div>
  );
}
