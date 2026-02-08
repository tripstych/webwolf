import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Toolbar from './components/Toolbar';
import ComponentLibrary from './components/ComponentLibrary';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import './App.css';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState('none'); // 'none', 'newProject', 'newTemplate', 'preview'

  const newProjectNameRef = useRef('');
  const newTemplateNameRef = useRef('');

  const API_BASE = '/api';

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load template when it changes
  useEffect(() => {
    if (currentTemplate) {
      setComponents(currentTemplate.structure?.components || []);
    }
  }, [currentTemplate]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects`);
      setProjects(response.data);
      if (response.data.length > 0 && !currentProject) {
        setCurrentProject(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async (name) => {
    try {
      const response = await axios.post(`${API_BASE}/projects`, {
        name,
        description: `Project created on ${new Date().toLocaleDateString()}`
      });
      setProjects([...projects, response.data]);
      setCurrentProject(response.data);
      setShowModal('none');
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const createTemplate = async (name) => {
    if (!currentProject) return;

    try {
      const response = await axios.post(`${API_BASE}/templates`, {
        projectId: currentProject.id,
        name,
        type: 'page',
        contentType: 'pages'
      });

      const updatedProject = {
        ...currentProject,
        templates: [...(currentProject.templates || []), response.data]
      };
      setCurrentProject(updatedProject);
      setCurrentTemplate(response.data);
      setComponents([]);
      setShowModal('none');
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate || !currentProject) return;

    setIsSaving(true);
    try {
      const updatedTemplate = {
        ...currentTemplate,
        structure: { components }
      };

      await axios.put(
        `${API_BASE}/templates/${currentTemplate.id}/project/${currentProject.id}`,
        updatedTemplate
      );

      // Generate and save Nunjucks file
      const generateResponse = await axios.post(`${API_BASE}/generate/save`, {
        template: updatedTemplate,
        projectId: currentProject.id
      });

      setCurrentTemplate(updatedTemplate);
      alert(`Template saved! File: ${generateResponse.data.filePath}`);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  const previewTemplate = async () => {
    if (!currentTemplate) return;

    try {
      const response = await axios.post(`${API_BASE}/generate/nunjucks`, {
        template: {
          ...currentTemplate,
          structure: { components }
        }
      });

      setShowModal('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview');
    }
  };

  if (!currentProject) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Template Builder</h1>
          <p className="text-gray-600 mb-8">Create beautiful templates visually</p>
          <button
            onClick={() => setShowModal('newProject')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
          >
            Create First Project
          </button>
        </div>

        {/* New Project Modal */}
        {showModal === 'newProject' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-2xl font-bold mb-4">Create New Project</h2>
              <input
                type="text"
                placeholder="Project name"
                ref={newProjectNameRef}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => createProject(newProjectNameRef.current.value)}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowModal('none')}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar
        projectName={currentProject?.name}
        templateName={currentTemplate?.name}
        isSaving={isSaving}
        onSave={saveTemplate}
        onPreview={previewTemplate}
        onNewProject={() => setShowModal('newProject')}
      />

      <div className="flex flex-1 overflow-hidden">
        <ComponentLibrary onDragStart={() => {}} />
        <Canvas components={components} onComponentsChange={setComponents} />
        {selectedComponent && (
          <PropertyPanel
            component={selectedComponent}
            onChange={(updated) => {
              setSelectedComponent(updated);
              setComponents(
                components.map(c => (c.id === updated.id ? updated : c))
              );
            }}
            onClose={() => setSelectedComponent(null)}
          />
        )}
      </div>

      {/* New Template Modal */}
      {showModal === 'newTemplate' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Create New Template</h2>
            <input
              type="text"
              placeholder="Template name"
              ref={newTemplateNameRef}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => createTemplate(newTemplateNameRef.current.value)}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Create
              </button>
              <button
                onClick={() => setShowModal('none')}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showModal === 'preview' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Preview</h2>
              <button
                onClick={() => setShowModal('none')}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
              {/* Preview will be generated on demand */}
              Template preview here
            </pre>
          </div>
        </div>
      )}

      {/* Project Sidebar - Simplified */}
      <div className="fixed left-0 top-16 h-20 w-64 bg-gray-50 border-r border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Templates</h3>
        <div className="space-y-1">
          {currentProject?.templates?.map(template => (
            <button
              key={template.id}
              onClick={() => setCurrentTemplate(template)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                currentTemplate?.id === template.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {template.name}
            </button>
          ))}
          <button
            onClick={() => setShowModal('newTemplate')}
            className="w-full text-left px-3 py-2 rounded text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
          >
            + New Template
          </button>
        </div>
      </div>
    </div>
  );
}
