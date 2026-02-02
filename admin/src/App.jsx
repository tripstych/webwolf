import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pages from './pages/Pages';
import PageEditor from './pages/PageEditor';
import Templates from './pages/Templates';
import Media from './pages/Media';
import Menus from './pages/Menus';
import Blocks from './pages/Blocks';
import Settings from './pages/Settings';
import SEO from './pages/SEO';

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
                <Route path="/seo" element={<SEO />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
