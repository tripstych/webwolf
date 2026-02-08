export default function TitleSlugSection({ title = '', slug = '', onTitleChange, onSlugChange }) {
  return (
    <div className="card p-6 space-y-4">
      <div>
        <label className="label">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input"
          placeholder="Title"
        />
      </div>
      <div>
        <label className="label">URL Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          className="input"
          placeholder="/pages/example"
        />
      </div>
    </div>
  );
}
