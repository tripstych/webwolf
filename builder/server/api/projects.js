import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/projects.json');

const router = Router();

// Ensure DB directory and file exist
async function ensureDB() {
  await fs.ensureDir(path.dirname(DB_PATH));
  if (!await fs.pathExists(DB_PATH)) {
    await fs.writeJSON(DB_PATH, { projects: [] }, { spaces: 2 });
  }
}

// Helper to read/write DB
async function readDB() {
  await ensureDB();
  return await fs.readJSON(DB_PATH);
}

async function writeDB(data) {
  await ensureDB();
  await fs.writeJSON(DB_PATH, data, { spaces: 2 });
}

// List all projects
router.get('/', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const db = await readDB();

    const project = {
      id: Date.now().toString(),
      name,
      description: description || '',
      templates: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.projects.push(project);
    await writeDB(db);

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const db = await readDB();
    const index = db.projects.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.projects[index] = {
      ...db.projects[index],
      ...req.body,
      id: db.projects[index].id, // preserve id
      created_at: db.projects[index].created_at, // preserve created_at
      updated_at: new Date().toISOString()
    };

    await writeDB(db);
    res.json(db.projects[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const db = await readDB();
    db.projects = db.projects.filter(p => p.id !== req.params.id);
    await writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
