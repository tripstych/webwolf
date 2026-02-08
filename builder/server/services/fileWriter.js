import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Write template file to filesystem
 * Saves as .njk file in the main server's templates directory
 */
export async function writeTemplateFile(projectId, templateName, content, customPath) {
  try {
    // Default output path is the main server's templates directory
    const defaultOutputPath = path.join(__dirname, '../../server/templates');
    const outputPath = customPath || defaultOutputPath;

    // Ensure output directory exists
    await fs.ensureDir(outputPath);

    // Create filename from template name
    const filename = `${templateName.toLowerCase().replace(/\s+/g, '-')}.njk`;
    const filePath = path.join(outputPath, filename);

    // Write file
    await fs.writeFile(filePath, content, 'utf8');

    console.log(`✅ Template saved: ${filePath}`);

    return {
      path: filePath,
      filename,
      projectId,
      templateName
    };
  } catch (err) {
    console.error('Error writing template file:', err);
    throw new Error(`Failed to write template file: ${err.message}`);
  }
}

/**
 * Delete template file
 */
export async function deleteTemplateFile(filePath) {
  try {
    await fs.remove(filePath);
    console.log(`✅ Template deleted: ${filePath}`);
    return { success: true };
  } catch (err) {
    console.error('Error deleting template file:', err);
    throw new Error(`Failed to delete template file: ${err.message}`);
  }
}

/**
 * Read template file
 */
export async function readTemplateFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (err) {
    console.error('Error reading template file:', err);
    throw new Error(`Failed to read template file: ${err.message}`);
  }
}

/**
 * List all template files in directory
 */
export async function listTemplateFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const templates = files
      .filter(f => f.isFile() && f.name.endsWith('.njk'))
      .map(f => ({
        name: f.name,
        path: path.join(dirPath, f.name)
      }));
    return templates;
  } catch (err) {
    console.error('Error listing template files:', err);
    throw new Error(`Failed to list template files: ${err.message}`);
  }
}
