import { Router } from 'express';
import authRoutes from './auth.js';
import pagesRoutes from './pages.js';
import templatesRoutes from './templates.js';
import mediaRoutes from './media.js';
import settingsRoutes from './settings.js';
import seoRoutes from './seo.js';
import menusRoutes from './menus.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/pages', pagesRoutes);
router.use('/templates', templatesRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingsRoutes);
router.use('/seo', seoRoutes);
router.use('/menus', menusRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
