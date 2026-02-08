import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectsRoutes from './api/projects.js';
import templatesRoutes from './api/templates.js';
import componentsRoutes from './api/components.js';
import generateRoutes from './api/generate.js';

dotenv.config();

const app = express();
const PORT = process.env.BUILDER_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/projects', projectsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/components', componentsRoutes);
app.use('/api/generate', generateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'WebWolf Template Builder' });
});

app.listen(PORT, () => {
  console.log(`🎨 Template Builder running on http://localhost:${PORT}`);
});
