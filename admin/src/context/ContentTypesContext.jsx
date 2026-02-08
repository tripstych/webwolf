import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const ContentTypesContext = createContext();

export function ContentTypesProvider({ children }) {
  const [contentTypes, setContentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContentTypes();
  }, []);

  const loadContentTypes = async () => {
    try {
      const data = await api.get('/content-types');
      setContentTypes(data);
    } catch (err) {
      console.error('Failed to load content types:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshContentTypes = () => {
    loadContentTypes();
  };

  return (
    <ContentTypesContext.Provider value={{ contentTypes, loading, refreshContentTypes }}>
      {children}
    </ContentTypesContext.Provider>
  );
}

export function useContentTypes() {
  const context = useContext(ContentTypesContext);
  if (!context) {
    throw new Error('useContentTypes must be used within ContentTypesProvider');
  }
  return context;
}
