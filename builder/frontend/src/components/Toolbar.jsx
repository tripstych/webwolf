import { Save, Eye, FolderPlus, Loader } from 'lucide-react';

export default function Toolbar({
  projectName,
  templateName,
  isSaving,
  onSave,
  onPreview,
  onNewProject
}) {
  return (
    <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Template Builder</h1>
          {projectName && <span className="text-gray-500">/ {projectName}</span>}
          {templateName && <span className="text-gray-500">/ {templateName}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            title="Create new project"
          >
            <FolderPlus size={18} />
            New Project
          </button>

          <button
            onClick={onPreview}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition-colors"
            title="Preview template"
          >
            <Eye size={18} />
            Preview
          </button>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium transition-colors"
            title="Save template"
          >
            {isSaving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
