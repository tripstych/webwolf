/**
 * Convert title to URL-friendly slug
 * Matches the backend slugify behavior
 */
export function slugify(text, module = 'pages') {
  if (!text) return '';

  const baseSlug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')   // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')       // Remove multiple hyphens
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens

  return `/${module}/${baseSlug}`;
}
