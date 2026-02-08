import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ContentTypesProvider } from './context/ContentTypesContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ContentTypesProvider>
          <App />
          <Toaster position="top-right" richColors />
        </ContentTypesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
