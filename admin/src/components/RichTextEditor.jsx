import { useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  return (
    <div className="ckeditor-container">
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
        config={{
          toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'strikethrough',
            '|',
            'bulletedList',
            'numberedList',
            'blockQuote',
            '|',
            'link',
            'imageUpload',
            '|',
            'undo',
            'redo',
          ],
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
            ],
          },
          image: {
            toolbar: ['imageTextAlternative'],
          },
        }}
      />
      <style>{`
        .ckeditor-container .ck-editor__main {
          min-height: 300px;
        }
        .ckeditor-container .ck-editor__editable {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
        }
        .ckeditor-container .ck-editor__editable p {
          font-size: 14px;
        }
        .ckeditor-container .ck-editor__editable h1 {
          font-size: 32px !important;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        .ckeditor-container .ck-editor__editable h2 {
          font-size: 24px !important;
          font-weight: bold;
          margin: 0.8em 0 0.4em;
        }
        .ckeditor-container .ck-editor__editable h3 {
          font-size: 20px !important;
          font-weight: bold;
          margin: 0.6em 0 0.3em;
        }
        .ckeditor-container .ck-toolbar {
          background: #f9fafb;
          border: 1px solid #d1d5db;
        }
        .ckeditor-container .ck.ck-editor__main {
          border: 1px solid #d1d5db;
        }
      `}</style>
    </div>
  );
}
