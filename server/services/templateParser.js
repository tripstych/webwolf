import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pluralize from 'pluralize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

/**
 * Parse a Nunjucks template file to extract CMS regions
 * Looks for data-cms-* attributes in the template
 * 
 * Supported attributes:
 * - data-cms-region="name" (required) - Unique identifier for the content region
 * - data-cms-type="text|richtext|textarea|image|repeater" - Field type
 * - data-cms-label="Label" - Human-readable label for the admin UI
 * - data-cms-required="true" - Whether the field is required
 * - data-cms-placeholder="text" - Placeholder text
 * - data-cms-fields="json" - For repeater fields, defines sub-fields
 */
export async function parseTemplate(filename) {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    return extractRegions(content);
  } catch (err) {
    console.error(`Failed to parse template ${filename}:`, err.message);
    return [];
  }
}

/**
 * Extract CMS regions from template content
 */
export function extractRegions(content) {
  const regions = [];
  
  // Match data-cms-region attributes with their associated attributes
  const regionRegex = /data-cms-region=["']([^"']+)["'][^>]*>/gi;
  const matches = content.matchAll(regionRegex);
  
  for (const match of matches) {
    const regionName = match[1];
    const fullMatch = match[0];
    
    // Extract other attributes from the same element
    const region = {
      name: regionName,
      type: extractAttribute(fullMatch, 'data-cms-type') || 'text',
      label: extractAttribute(fullMatch, 'data-cms-label') || formatLabel(regionName),
      required: extractAttribute(fullMatch, 'data-cms-required') === 'true',
      placeholder: extractAttribute(fullMatch, 'data-cms-placeholder') || ''
    };
    
    // Handle repeater fields
    if (region.type === 'repeater') {
      const fieldsJson = extractAttribute(fullMatch, 'data-cms-fields');
      if (fieldsJson) {
        try {
          region.fields = JSON.parse(fieldsJson.replace(/&quot;/g, '"'));
        } catch (e) {
          region.fields = [];
        }
      }
    }
    
    // Avoid duplicates
    if (!regions.find(r => r.name === regionName)) {
      regions.push(region);
    }
  }
  
  return regions;
}

/**
 * Extract a specific attribute value from an HTML tag string
 */
function extractAttribute(tagString, attrName) {
  const regex = new RegExp(`${attrName}=("([^"]*)"|'([^']*)')`, 'i');
  const match = tagString.match(regex);
  return match ? (match[2] ?? match[3] ?? null) : null;
}

/**
 * Convert snake_case or kebab-case to Title Case
 */
function formatLabel(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extract content type from template filename
 * Examples:
 *   "pages/homepage.njk" → "pages"
 *   "blog/post.njk" → "blog"
 *   "products/single.njk" → "products"
 */
export function extractContentType(filename) {
  const parts = filename.split('/');
  return parts[0]; // First folder is content type
}

/**
 * Format content type name to label
 * Examples:
 *   "blog" → "Blog"
 *   "products" → "Products"
 */
function formatContentTypeLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Get default icon based on content type name
 */
function getDefaultIcon(contentType) {
  const iconMap = {
    'pages': 'FileText',
    'blocks': 'Boxes',
    'blog': 'BookOpen',
    'news': 'Newspaper',
    'products': 'Package',
    'team': 'Users',
    'portfolio': 'Briefcase'
  };
  return iconMap[contentType] || 'FileText';
}

/**
 * Scan all templates in the templates directory
 */
export async function scanTemplates() {
  const templates = [];

  async function scanDir(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip layouts directory for page templates
        if (entry.name !== 'layouts') {
          await scanDir(path.join(dir, entry.name), relativePath);
        }
      } else if (entry.name.endsWith('.njk')) {
        const regions = await parseTemplate(relativePath);
        templates.push({
          filename: relativePath,
          name: formatLabel(entry.name.replace('.njk', '')),
          regions
        });
      }
    }
  }

  await scanDir(TEMPLATES_DIR);
  return templates;
}

/**
 * Scan only block templates (from blocks/ directory)
 */
export async function scanBlockTemplates() {
  const templates = [];
  const blocksDir = path.join(TEMPLATES_DIR, 'blocks');

  try {
    const entries = await fs.readdir(blocksDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.njk')) {
        const relativePath = `blocks/${entry.name}`;
        const regions = await parseTemplate(relativePath);
        templates.push({
          filename: relativePath,
          name: formatLabel(entry.name.replace('.njk', '')),
          regions
        });
      }
    }
  } catch (err) {
    console.error('Failed to scan block templates:', err.message);
  }

  return templates;
}

/**
 * Scan only page templates (excluding blocks/ and layouts/)
 */
export async function scanPageTemplates() {
  const templates = [];

  async function scanDir(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip layouts and blocks directories
        if (entry.name !== 'layouts' && entry.name !== 'blocks') {
          await scanDir(path.join(dir, entry.name), relativePath);
        }
      } else if (entry.name.endsWith('.njk')) {
        const regions = await parseTemplate(relativePath);
        templates.push({
          filename: relativePath,
          name: formatLabel(entry.name.replace('.njk', '')),
          regions
        });
      }
    }
  }

  await scanDir(TEMPLATES_DIR);
  return templates;
}

/**
 * Auto-register content types discovered from templates
 */
async function registerContentTypes(prisma, templates) {
  const discoveredTypes = new Set();

  templates.forEach(template => {
    const contentType = extractContentType(template.filename);
    discoveredTypes.add(contentType);
  });

  for (const typeName of discoveredTypes) {
    // Check if content type already exists
    const existing = await prisma.content_types.findUnique({
      where: { name: typeName }
    });

    if (!existing) {
      // Create new content type with sensible defaults
      const label = formatContentTypeLabel(typeName);
      const pluralLabel = pluralize.plural(label);

      await prisma.content_types.create({
        data: {
          name: typeName,
          label,
          plural_label: pluralLabel,
          icon: getDefaultIcon(typeName),
          has_status: typeName !== 'blocks', // blocks don't have status
          has_seo: typeName !== 'blocks'     // all non-block types have SEO
        }
      });
    }
  }
}

/**
 * Sync templates from filesystem to database
 */
export async function syncTemplatesToDb(prisma) {
  const templates = await scanTemplates();

  for (const template of templates) {
    const contentType = extractContentType(template.filename);

    // Use upsert to insert or update
    await prisma.templates.upsert({
      where: { filename: template.filename },
      create: {
        name: template.name,
        filename: template.filename,
        regions: JSON.stringify(template.regions),
        content_type: contentType
      },
      update: {
        name: template.name,
        regions: JSON.stringify(template.regions),
        content_type: contentType
      }
    });
  }

  // Auto-discover and register new content types
  await registerContentTypes(prisma, templates);

  return templates;
}

export default { parseTemplate, extractRegions, scanTemplates, syncTemplatesToDb };
