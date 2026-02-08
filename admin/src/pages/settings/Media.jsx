import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  Edit,
  X,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Media() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [editingAlt, setEditingAlt] = useState(false);
  const [altText, setAltText] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMedia();
  }, [pagination.page]);

  const loadMedia = async () => {
    try {
      const data = await api.get(`/media?page=${pagination.page}&limit=24`);
      setMedia(data.media || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        await api.upload('/media/upload', formData);
      } else {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        await api.upload('/media/upload/multiple', formData);
      }
      loadMedia();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/media/${id}`);
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
      loadMedia();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleSaveAlt = async () => {
    if (!selectedMedia) return;
    try {
      await api.put(`/media/${selectedMedia.id}`, { alt_text: altText });
      setSelectedMedia({ ...selectedMedia, alt_text: altText });
      setEditingAlt(false);
      loadMedia();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const isImage = (mimeType) => mimeType?.startsWith('image/');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Media Grid */}
        <div className="lg:col-span-3">
          {media.length === 0 ? (
            <div className="card p-12 text-center">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No media files yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload images and documents to get started
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {media.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMedia(item);
                      setAltText(item.alt_text || '');
                      setEditingAlt(false);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                      selectedMedia?.id === item.id
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {isImage(item.mime_type) ? (
                      <img
                        src={`/uploads${item.path}`}
                        alt={item.alt_text || item.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                        <FileText className="w-12 h-12 text-gray-400" />
                        <p className="text-xs text-gray-500 mt-2 px-2 truncate w-full text-center">
                          {item.original_name}
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">View</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="btn btn-ghost"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="btn btn-ghost"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedMedia ? (
            <div className="card p-4 space-y-4 sticky top-20">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-gray-900">Details</h3>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {isImage(selectedMedia.mime_type) && (
                <img
                  src={`/uploads${selectedMedia.path}`}
                  alt={selectedMedia.alt_text || ''}
                  className="w-full rounded-lg"
                />
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Filename</p>
                  <p className="font-medium text-gray-900 break-all">
                    {selectedMedia.original_name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">{selectedMedia.mime_type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Size</p>
                  <p className="font-medium text-gray-900">
                    {(selectedMedia.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">URL</p>
                  <input
                    type="text"
                    readOnly
                    value={`/uploads${selectedMedia.path}`}
                    className="input text-xs mt-1"
                    onClick={(e) => e.target.select()}
                  />
                </div>

                {/* Alt Text */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500">Alt Text</p>
                    {!editingAlt && (
                      <button
                        onClick={() => setEditingAlt(true)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {editingAlt ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        className="input flex-1"
                        placeholder="Describe this image"
                      />
                      <button onClick={handleSaveAlt} className="btn btn-primary px-2">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">
                      {selectedMedia.alt_text || '-'}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(selectedMedia.id)}
                className="btn btn-danger w-full mt-4"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-500">
              <p className="text-sm">Select a file to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
