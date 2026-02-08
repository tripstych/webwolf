import { useState, useRef } from 'react';
import ComponentRenderer from './ComponentRenderer';
import Resizer from './Resizer';
import { Trash2 } from 'lucide-react';

export default function Canvas({ components, onComponentsChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const componentData = JSON.parse(e.dataTransfer.getData('application/json'));
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newComponent = {
        id: Date.now().toString(),
        type: componentData.type,
        props: { ...componentData.defaultProps },
        position: { x: `${x}px`, y: `${y}px` },
        size: { width: '300px', height: 'auto' },
        isEditable: false,
        isRepeating: false,
        children: []
      };

      onComponentsChange([...components, newComponent]);
      setSelectedId(newComponent.id);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  const handleDelete = (id) => {
    onComponentsChange(components.filter(c => c.id !== id));
    setSelectedId(null);
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 p-8 overflow-auto"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="max-w-6xl mx-auto bg-white min-h-screen shadow-xl rounded-lg p-8">
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <p className="text-xl font-medium">Drag components here to start building</p>
            <p className="text-sm mt-2">Select components from the library on the left</p>
          </div>
        ) : (
          <div className="space-y-4">
            {components.map((component) => (
              <div
                key={component.id}
                onClick={() => setSelectedId(component.id)}
                className={`relative cursor-pointer transition-all ${
                  selectedId === component.id ? 'ring-2 ring-blue-500 ring-offset-2 rounded' : ''
                }`}
              >
                <ComponentRenderer component={component} />

                {selectedId === component.id && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(component.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                      title="Delete component"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {selectedId === component.id && (
                  <Resizer
                    component={component}
                    onChange={(updated) => {
                      const newComponents = components.map(c =>
                        c.id === component.id ? updated : c
                      );
                      onComponentsChange(newComponents);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
