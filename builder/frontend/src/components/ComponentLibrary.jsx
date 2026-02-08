import { COMPONENT_LIBRARY } from '../lib/componentDefinitions';
import * as Icons from 'lucide-react';

export default function ComponentLibrary({ onDragStart }) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Components</h2>

      <div className="space-y-2">
        {Object.entries(COMPONENT_LIBRARY).map(([key, component]) => {
          const Icon = Icons[component.icon] || Icons.Box;

          return (
            <div
              key={key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify(component));
              }}
              className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg cursor-move hover:shadow-md transition-all border border-blue-200 active:opacity-75"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{component.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
