import { Router } from 'express';
import authRoutes from './auth.js';
import customerAuthRoutes from './customer-auth.js';
import pagesRoutes from './pages.js';
import templatesRoutes from './templates.js';
import mediaRoutes from './media.js';
import settingsRoutes from './settings.js';
import seoRoutes from './seo.js';
import menusRoutes from './menus.js';
import blocksRoutes from './blocks.js';
import contentTypesRoutes from './contentTypes.js';
import debugRoutes from './debug.js';
import extensionsRoutes from './extensions.js';
import productsRoutes from './products.js';
import ordersRoutes from './orders.js';
import cartRoutes from './cart.js';
import paymentsRoutes from './payments.js';
import groupsRoutes from './groups.js';
import customersRoutes from './customers.js';
import stripeWebhookRoutes from './webhooks/stripe.js';
import paypalWebhookRoutes from './webhooks/paypal.js';
import { autoLoadApiModules } from '../services/extensionLoader.js';

const router = Router();

// System routes (always available)
router.use('/auth', authRoutes);
router.use('/customer-auth', customerAuthRoutes);
router.use('/pages', pagesRoutes);
router.use('/templates', templatesRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingsRoutes);
router.use('/seo', seoRoutes);
router.use('/menus', menusRoutes);
router.use('/blocks', blocksRoutes);
router.use('/content-types', contentTypesRoutes);
router.use('/extensions', extensionsRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentsRoutes);
router.use('/groups', groupsRoutes);
router.use('/customers', customersRoutes);
router.use('/webhooks/stripe', stripeWebhookRoutes);
router.use('/webhooks/paypal', paypalWebhookRoutes);
router.use('/debug', debugRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Function to auto-load content type APIs
export async function registerContentTypeApis(app) {
  await autoLoadApiModules(app);
}

export default router;
