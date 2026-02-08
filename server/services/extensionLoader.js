import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const API_DIR = path.join(__dirname, '../api');

/**
 * Discover all content types from template folders
 */
export async function discoverContentTypes() {
  const contentTypes = [];

  try {
    const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and special directories
      if (entry.isDirectory() && entry.name !== 'layouts') {
        contentTypes.push(entry.name);
      }
    }
  } catch (err) {
    console.error('Failed to discover content types:', err.message);
  }

  return contentTypes;
}

/**
 * Check if an API module exists for a content type
 */
export async function hasApiModule(contentType) {
  const modulePath = path.join(API_DIR, `${contentType}.js`);

  try {
    await fs.access(modulePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dynamically load and register API routes for a content type
 */
export async function loadApiModule(app, contentType) {
  try {
    const hasModule = await hasApiModule(contentType);

    if (!hasModule) {
      console.log(`⚠️  No API module found for content type: ${contentType}`);
      return null;
    }

    // Dynamically import the module with a unique cache-bust query to force fresh import
    const modulePath = path.join(API_DIR, `${contentType}.js`);
    const absolutePath = new URL(`file://${modulePath}`).href;

    const module = await import(absolutePath);
    const router = module.default;

    if (!router) {
      console.error(`❌ API module for ${contentType} does not export a default router`);
      return null;
    }

    // Register the router at /api/[contentType]
    app.use(`/api/${contentType}`, router);
    console.log(`✅ Registered API routes for: ${contentType}`);

    return router;
  } catch (err) {
    console.error(`❌ Failed to load API module for ${contentType}:`, err.message);
    return null;
  }
}

/**
 * Auto-discover and load all available API modules
 */
export async function autoLoadApiModules(app) {
  const contentTypes = await discoverContentTypes();
  const loadedModules = [];

  for (const contentType of contentTypes) {
    const result = await loadApiModule(app, contentType);
    if (result) {
      loadedModules.push(contentType);
    }
  }

  console.log(`\n📦 Auto-loaded ${loadedModules.length} API module(s): ${loadedModules.join(', ')}`);
  return loadedModules;
}

export default { discoverContentTypes, hasApiModule, loadApiModule, autoLoadApiModules };
