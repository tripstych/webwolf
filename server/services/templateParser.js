import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const regex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
  const match = tagString.match(regex);
  return match ? match[1] : null;
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
 * Sync templates from filesystem to database
 */
export async function syncTemplatesToDb(query) {
  const templates = await scanTemplates();
  
  for (const template of templates) {
    await query(
      `INSERT INTO templates (name, filename, regions) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE regions = VALUES(regions), name = VALUES(name)`,
      [template.name, template.filename, JSON.stringify(template.regions)]
    );
  }
  
  return templates;
}

export default { parseTemplate, extractRegions, scanTemplates, syncTemplatesToDb };
