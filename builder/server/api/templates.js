import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/projects.json');

const router = Router();

// Helper to read/write DB
async function ensureDB() {
  await fs.ensureDir(path.dirname(DB_PATH));
  if (!await fs.pathExists(DB_PATH)) {
    await fs.writeJSON(DB_PATH, { projects: [] }, { spaces: 2 });
  }
}

async function readDB() {
  await ensureDB();
  return await fs.readJSON(DB_PATH);
}

async function writeDB(data) {
  await ensureDB();
  await fs.writeJSON(DB_PATH, data, { spaces: 2 });
}

// Get all templates for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project.templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/:templateId/project/:projectId', async (req, res) => {
  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const template = project.templates.find(t => t.id === req.params.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const { projectId, name, type = 'page', contentType = 'pages' } = req.body;
    if (!projectId || !name) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    const db = await readDB();
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const template = {
      id: Date.now().toString(),
      name,
      type,
      contentType,
      structure: { components: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    project.templates.push(template);
    project.updated_at = new Date().toISOString();
    await writeDB(db);

    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template (structure + metadata)
router.put('/:templateId/project/:projectId', async (req, res) => {
  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const templateIndex = project.templates.findIndex(t => t.id === req.params.templateId);
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    project.templates[templateIndex] = {
      ...project.templates[templateIndex],
      ...req.body,
      id: project.templates[templateIndex].id,
      created_at: project.templates[templateIndex].created_at,
      updated_at: new Date().toISOString()
    };

    project.updated_at = new Date().toISOString();
    await writeDB(db);

    res.json(project.templates[templateIndex]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/:templateId/project/:projectId', async (req, res) => {
  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.templates = project.templates.filter(t => t.id !== req.params.templateId);
    project.updated_at = new Date().toISOString();
    await writeDB(db);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
