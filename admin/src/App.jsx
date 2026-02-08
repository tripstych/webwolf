import { Fragment } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useContentTypes } from './context/ContentTypesContext';
import Layout from './components/Layout';
import Login from './core/Login';
import Dashboard from './core/Dashboard';
import Pages from './pages/Pages';
import PageEditor from './pages/PageEditor';
import Templates from './settings/Templates';
import Media from './settings/Media';
import Menus from './settings/Menus';
import Blocks from './blocks/Blocks';
import BlockEditor from './blocks/BlockEditor';
import Settings from './settings/Settings';
import SEO from './settings/SEO';
import ContentList from './content/ContentList';
import ContentEditor from './content/ContentEditor';
import ProductList from './products/ProductList';
import ProductEditor from './products/ProductEditor';
import OrderList from './orders/OrderList';
import OrderDetail from './orders/OrderDetail';
import GroupList from './groups/GroupList';
import GroupEditor from './groups/GroupEditor';

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
