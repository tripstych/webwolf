import { Router } from 'express';
import { generateNunjucksTemplate } from '../services/templateGenerator.js';
import { writeTemplateFile } from '../services/fileWriter.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Generate Nunjucks template from component structure
router.post('/nunjucks', async (req, res) => {
  try {
    const { template, projectId } = req.body;
    if (!template) {
      return res.status(400).json({ error: 'Template data is required' });
    }

    const nunjucksHTML = generateNunjucksTemplate(template);
    res.json({ html: nunjucksHTML });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate and save template file
router.post('/save', async (req, res) => {
  try {
    const { template, projectId, outputPath } = req.body;
    if (!template || !projectId) {
      return res.status(400).json({ error: 'Template and project ID are required' });
    }

    const nunjucksHTML = generateNunjucksTemplate(template);
    const filePath = await writeTemplateFile(
      projectId,
      template.name,
      nunjucksHTML,
      outputPath
    );

    res.json({
      success: true,
      filePath,
      html: nunjucksHTML
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview template with sample data
router.post('/preview', async (req, res) => {
  try {
    const { template, sampleData = {} } = req.body;
    if (!template) {
      return res.status(400).json({ error: 'Template data is required' });
    }

    const nunjucksHTML = generateNunjucksTemplate(template);
    res.json({ html: nunjucksHTML, data: sampleData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
