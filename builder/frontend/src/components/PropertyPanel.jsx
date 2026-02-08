import { COMPONENT_LIBRARY } from '../lib/componentDefinitions';
import { X } from 'lucide-react';

export default function PropertyPanel({ component, onChange, onClose }) {
  if (!component) return null;

  const definition = COMPONENT_LIBRARY[component.type];
  if (!definition) return null;

  const handlePropChange = (key, value) => {
    onChange({
      ...component,
      props: {
        ...component.props,
        [key]: value
      }
    });
  };

  const handleEditableChange = (isEditable) => {
    onChange({
      ...component,
      isEditable,
      cmsRegion: isEditable
        ? {
            name: `${component.type}_${component.id}`,
            type: 'text',
            label: definition.label
          }
        : null
    });
  };

  const handleRepeatingChange = (isRepeating) => {
    onChange({
      ...component,
      isRepeating,
      cmsRegion: isRepeating
        ? {
            name: `repeater_${component.id}`,
            type: 'repeater',
            label: `${definition.label} List`
          }
        : null
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Properties</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Component type */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700">Type</p>
        <p className="text-gray-600">{definition.label}</p>
      </div>

      {/* Component ID */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700">ID</p>
        <p className="text-xs text-gray-500 font-mono">{component.id}</p>
      </div>

      {/* Size and Position */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Size & Position</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600">Width</label>
            <input
              type="text"
              value={component.size?.width || 'auto'}
              onChange={(e) =>
                onChange({
                  ...component,
                  size: { ...component.size, width: e.target.value }
                })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Height</label>
            <input
              type="text"
              value={component.size?.height || 'auto'}
              onChange={(e) =>
                onChange({
                  ...component,
                  size: { ...component.size, height: e.target.value }
                })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Component-specific properties */}
      {definition.editableFields && definition.editableFields.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Content</p>
          <div className="space-y-2">
            {definition.editableFields.map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-600 capitalize">{field}</label>
                {field === 'color' ? (
                  <input
                    type="color"
                    value={component.props?.[field] || definition.defaultProps[field]}
                    onChange={(e) => handlePropChange(field, e.target.value)}
                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                  />
                ) : field === 'columns' ? (
                  <input
                    type="number"
                    value={component.props?.[field] || definition.defaultProps[field]}
                    onChange={(e) => handlePropChange(field, parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    max="6"
                  />
                ) : (
                  <input
                    type="text"
                    value={component.props?.[field] || definition.defaultProps[field]}
                    onChange={(e) => handlePropChange(field, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CMS Region Settings */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">CMS Settings</p>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={component.isEditable || false}
            onChange={(e) => handleEditableChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Mark as editable (CMS region)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={component.isRepeating || false}
            onChange={(e) => handleRepeatingChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Mark as repeating (list)</span>
        </label>
      </div>

      {/* CMS Region Info */}
      {(component.isEditable || component.isRepeating) && component.cmsRegion && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs font-medium text-blue-900 mb-1">CMS Region:</p>
          <p className="text-xs text-blue-800 font-mono mb-1">{component.cmsRegion.name}</p>
          <p className="text-xs text-blue-700">Type: {component.cmsRegion.type}</p>
        </div>
      )}
    </div>
  );
}
