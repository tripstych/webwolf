import { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';
import MediaPicker from './MediaPicker';

export default function RichTextEditor({ value, onChange }) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleMediaSelect = (media) => {
    if (editor) {
      editor.chain().focus().setImage({ src: media.url, alt: media.alt }).run();
      setShowMediaPicker(false);
    }
  };

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({ onClick, active, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 ${
        active ? 'bg-gray-100 text-primary-600' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add Link">
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setShowMediaPicker(true)}
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} className="prose prose-sm max-w-none p-4" />
      </div>

      {showMediaPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      <style>{`
        .ProseMirror {
          min-h-[200px] outline-none;
        }
        .ProseMirror p {
          margin-bottom: 1rem;
        }
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
          margin-top: 1rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
          margin-top: 0.75rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          margin-top: 0.5rem;
        }
        .ProseMirror ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .ProseMirror ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
        }
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
    </>
  );
}
