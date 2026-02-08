import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';

import apiRoutes, { registerContentTypeApis } from './api/index.js';
import publicRoutes from './render/public.js';
import { initDb, query } from './db/connection.js';
import registerTemplateExtensions from '../templates/pages/extensions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Nunjucks setup for public site
const nunjucksEnv = nunjucks.configure(path.join(__dirname, '../templates'), {
  autoescape: true,
  express: app,
  watch: process.env.NODE_ENV === 'development',
  noCache: process.env.NODE_ENV === 'development'
});

// Add custom filters for SEO
nunjucksEnv.addFilter('truncate', (str, length) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
});

nunjucksEnv.addFilter('stripHtml', (str) => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
});

nunjucksEnv.addFilter('date', (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('MMM', monthNames[d.getMonth()])
    .replace('M', d.getMonth() + 1)
    .replace('D', d.getDate());
});

// Load template extensions (product embeds, etc.)
registerTemplateExtensions(nunjucksEnv, query);

// Store nunjucks environment for use in routes
app.locals.nunjucksEnv = nunjucksEnv;

// Helper function to set up renderBlock for a page render
export function setupRenderBlock(env, blocksData) {
  const parseJsonField = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      if (value.trim() === '') return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  };

  env.addGlobal('renderBlock', (slug) => {
    const block = blocksData.find(b => b.slug === slug);
    if (!block) {
      console.warn(`Block not found: ${slug}`);
      return '';
    }

    try {
      const blockContent = parseJsonField(block.content) || {};
      const html = env.render(block.template_filename, {
        content: blockContent,
        block
      });
      return html;
    } catch (err) {
      console.error(`Error rendering block ${slug}:`, err);
      return '';
    }
  });
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
  credentials: true
}));

// Capture raw body for webhook signature verification (must be before JSON parsing)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks/')) {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString('utf8');
    });
    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/', express.static(path.join(__dirname, '../public')));

// Serve React admin in production
if (process.env.NODE_ENV === 'production') {
  app.use('/admin', express.static(path.join(__dirname, '../admin/dist')));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
  });
}

// API routes
app.use('/api', apiRoutes);

// Auto-load content type APIs based on template folders
registerContentTypeApis(app).catch(err => {
  console.error('Failed to auto-load content type APIs:', err);
});

// Public site routes (must be last)
app.use('/', publicRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🐺 WebWolf CMS running on http://localhost:${PORT}`);
    console.log(`📝 Admin UI: http://localhost:5173 (dev) or http://localhost:${PORT}/admin (prod)`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;
