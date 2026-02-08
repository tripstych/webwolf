import { Fragment } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useContentTypes } from './context/ContentTypesContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pages from './pages/Pages';
import PageEditor from './pages/PageEditor';
import Templates from './pages/Templates';
import Media from './pages/Media';
import Menus from './pages/Menus';
import Blocks from './pages/Blocks';
import BlockEditor from './pages/BlockEditor';
import Settings from './pages/Settings';
import SEO from './pages/SEO';
import ContentList from './pages/ContentList';
import ContentEditor from './pages/ContentEditor';
import ProductList from './pages/ProductList';
import ProductEditor from './pages/ProductEditor';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import GroupList from './pages/GroupList';
import GroupEditor from './pages/GroupEditor';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  const { contentTypes } = useContentTypes();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pages" element={<Pages />} />
                <Route path="/pages/new" element={<PageEditor />} />
                <Route path="/pages/:id" element={<PageEditor />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/media" element={<Media />} />
                <Route path="/menus" element={<Menus />} />
                <Route path="/blocks" element={<Blocks />} />
                <Route path="/blocks/new" element={<BlockEditor />} />
                <Route path="/blocks/:id" element={<BlockEditor />} />
                <Route path="/seo" element={<SEO />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/new" element={<ProductEditor />} />
                <Route path="/products/:id" element={<ProductEditor />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/groups/new" element={<GroupEditor />} />
                <Route path="/groups/:id" element={<GroupEditor />} />

                {/* Dynamic content type routes */}
                {contentTypes.map(type => (
                  <Fragment key={type.name}>
                    <Route
                      path={`/${type.name}`}
                      element={<ContentList />}
                    />
                    <Route
                      path={`/${type.name}/new`}
                      element={<ContentEditor />}
                    />
                    <Route
                      path={`/${type.name}/:id`}
                      element={<ContentEditor />}
                    />
                  </Fragment>
                ))}
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
