import { Router } from 'express';
import { query } from '../db/connection.js';
import { getAllMenus } from '../services/menuService.js';
import { setupRenderBlock } from '../index.js';

const router = Router();

function shouldLogRender(req) {
  return true;
}

function logRender(...args) {
  console.log('[WebWolf:render]', ...args);
}

function parseJsonField(value) {
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
}

function setRenderDebugHeaders(req, res, page, content) {
  const token = process.env.DEBUG_TOKEN;
  const debugParam = req.query?.__debug;
  if (!token || typeof debugParam !== 'string' || debugParam !== token) return;

  const features = content?.features;
  const isArray = Array.isArray(features);
  const length = isArray ? features.length : 0;
  const type = features === null ? 'null' : typeof features;

  res.setHeader('X-WebWolf-Debug', '1');
  res.setHeader('X-WebWolf-Page-Id', String(page?.id ?? ''));
  res.setHeader('X-WebWolf-Page-Slug', String(page?.slug ?? ''));
  res.setHeader('X-WebWolf-Template', String(page?.template_filename ?? ''));
  res.setHeader('X-WebWolf-Features-Type', type);
  res.setHeader('X-WebWolf-Features-IsArray', isArray ? 'true' : 'false');
  res.setHeader('X-WebWolf-Features-Length', String(length));
}

// Serve robots.txt
router.get('/robots.txt', async (req, res) => {
  try {
    const settings = await query('SELECT setting_value FROM settings WHERE setting_key = ?', ['robots_txt']);
    const robotsTxt = settings[0]?.setting_value || 'User-agent: *\nAllow: /';
    res.type('text/plain').send(robotsTxt);
  } catch (err) {
    res.type('text/plain').send('User-agent: *\nAllow: /');
  }
});

// Serve sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const settings = await query('SELECT setting_value FROM settings WHERE setting_key = ?', ['site_url']);
    const siteUrl = settings[0]?.setting_value || `${req.protocol}://${req.get('host')}`;

    // Query pages with published status via content table
    const pages = await query(`
      SELECT c.slug, p.updated_at
      FROM pages p
      JOIN content c ON p.content_id = c.id
      WHERE p.status = ?
      ORDER BY p.updated_at DESC
    `, ['published']);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of pages) {
      const slug = page.slug === '/' ? '' : page.slug;
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}${slug}</loc>\n`;
      xml += `    <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += `    <priority>${page.slug === '/' ? '1.0' : '0.8'}</priority>\n`;
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Handle redirects
router.use(async (req, res, next) => {
  try {
    const redirects = await query(
      'SELECT * FROM redirects WHERE source_path = ?',
      [req.path]
    );
    
    if (redirects[0]) {
      return res.redirect(redirects[0].status_code, redirects[0].target_path);
    }
    
    next();
  } catch (err) {
    next();
  }
});

// Render pages and other content types
router.get('*', async (req, res) => {
  try {
    // Get site settings first to check for home page
    const site = await getSiteSettings();

    // Normalize path
    let slug = req.path;
    if (slug !== '/' && slug.endsWith('/')) {
      slug = slug.slice(0, -1);
    }

    // If root path and home page is set, route to that page
    if (slug === '/' && site.home_page_id) {
      try {
        const homePage = await query(
          'SELECT p.id, c.slug FROM pages p LEFT JOIN content c ON p.content_id = c.id WHERE p.id = ?',
          [site.home_page_id]
        );
        if (homePage && homePage[0] && homePage[0].slug) {
          slug = homePage[0].slug;
        }
      } catch (err) {
        // If home page lookup fails, continue with root path
        logRender('home_page_lookup_error', { error: err.message });
      }
    }

    // Default to /pages/ if no module prefix
    if (slug !== '/') {
      const segments = slug.split('/').filter(s => s);
      const knownModules = ['pages', 'products', 'blocks'];

      if (segments.length > 0 && !knownModules.includes(segments[0])) {
        // No module prefix, default to /pages/
        slug = '/pages' + slug;
      }
    }

    if (shouldLogRender(req)) {
      logRender('request', { path: req.path, normalizedSlug: slug });
    }

    // Check if this is a module index request (e.g., /pages/, /products/)
    const knownModules = ['pages', 'products', 'blocks'];
    const moduleMatch = slug.match(/^\/([a-z]+)\/?$/);
    if (moduleMatch && knownModules.includes(moduleMatch[1])) {
      const module = moduleMatch[1];
      try {
        const templatePath = `${module}/index.njk`;

        // Get module content for context
        const moduleContent = await query(`
          SELECT c.id, c.module, c.slug, c.title, COALESCE(c.data, '{}') as data
          FROM content c
          WHERE c.module = ?
          ORDER BY c.title ASC
        `, [module]);

        const menus = await getAllMenus();
        const blocksData = await getAllBlocks();
        setupRenderBlock(req.app.locals.nunjucksEnv, blocksData);

        const context = {
          module,
          content: moduleContent,
          seo: {
            title: `${module.charAt(0).toUpperCase() + module.slice(1)} - ${site.site_name}`,
            description: site.default_meta_description,
            robots: 'index, follow'
          },
          site,
          menus
        };

        if (shouldLogRender(req)) {
          logRender('module_index', { module, contentCount: moduleContent.length });
        }

        return res.render(templatePath, context);
      } catch (err) {
        if (shouldLogRender(req)) {
          logRender('module_index_error', { module: moduleMatch[1], error: err.message });
        }
        // Fall through to 404 if template doesn't exist
      }
    }

    // Query content table by slug (slug includes module prefix for uniqueness)
    const contentRows = await query(
      'SELECT id, module, title, data FROM content WHERE slug = ?',
      [slug]
    );

    if (!contentRows[0]) {
      // Try to render 404 template
      return res.status(404).render('pages/404.njk', {
        title: 'Page Not Found',
        site: await getSiteSettings()
      });
    }

    const contentRow = contentRows[0];
    const contentType = contentRow.module;

    if (shouldLogRender(req)) {
      logRender('content_found', {
        slug: slug,
        contentType: contentType,
        contentId: contentRow.id
      });
    }

    // Query the appropriate module table based on content type
    let pageData;
    if (contentType === 'pages') {
      const pages = await query(`
        SELECT p.*, t.filename as template_filename
        FROM pages p
        LEFT JOIN templates t ON p.template_id = t.id
        WHERE p.content_id = ? AND p.status = 'published'
      `, [contentRow.id]);
      pageData = pages[0];
    } else if (contentType === 'products') {
      const products = await query(`
        SELECT pr.*, t.filename as template_filename,
               c.title as content_title
        FROM products pr
        LEFT JOIN templates t ON pr.template_id = t.id
        LEFT JOIN content c ON pr.content_id = c.id
        WHERE pr.content_id = ? AND pr.status IN ('active', 'draft')
      `, [contentRow.id]);
      pageData = products[0];
      // Map content title to page.title for template consistency
      if (pageData && pageData.content_title) {
        pageData.title = pageData.content_title;
        delete pageData.content_title;
      }
    } else if (contentType === 'blocks') {
      const blocks = await query(`
        SELECT b.*, t.filename as template_filename
        FROM blocks b
        LEFT JOIN templates t ON b.template_id = t.id
        WHERE b.content_id = ?
      `, [contentRow.id]);
      pageData = blocks[0];
    } else {
      // Unknown content type, try to render as page
      const pages = await query(`
        SELECT p.*, t.filename as template_filename
        FROM pages p
        LEFT JOIN templates t ON p.template_id = t.id
        WHERE p.content_id = ? AND p.status = 'published'
      `, [contentRow.id]);
      pageData = pages[0];
    }

    if (!pageData) {
      // Try to render 404 template
      return res.status(404).render('pages/404.njk', {
        title: 'Page Not Found',
        site: await getSiteSettings()
      });
    }

    if (!pageData.template_filename) {
      console.error('No template assigned to content:', { contentType, contentId: contentRow.id });
      return res.status(500).render('pages/500.njk', {
        title: 'Server Error',
        site: await getSiteSettings()
      });
    }

    // Parse content JSON
    const content = parseJsonField(contentRow.data) || {};

    if (shouldLogRender(req)) {
      const features = content?.features;
      logRender('selected_page', {
        id: pageData.id,
        slug: slug,
        template: pageData.template_filename,
        contentType: contentType,
        featuresType: features === null ? 'null' : typeof features,
        featuresIsArray: Array.isArray(features),
        featuresLength: Array.isArray(features) ? features.length : 0
      });

      // Debug: log all keys in pageData for products
      if (contentType === 'products') {
        logRender('product_data_keys', Object.keys(pageData));
      }
    }

    // Parse schema markup (may not exist on all content types)
    const schemaMarkup = parseJsonField(pageData.schema_markup || null);

    // Get menus and blocks
    const menus = await getAllMenus();
    const blocksData = await getAllBlocks();

    // Set up renderBlock function for this render
    setupRenderBlock(req.app.locals.nunjucksEnv, blocksData);

    // Build SEO data (with fallbacks for fields that may not exist on all content types)
    const seo = {
      title: pageData.meta_title || contentRow.title,
      description: pageData.meta_description || '',
      canonical: pageData.canonical_url || `${site.site_url}${slug}`,
      robots: pageData.robots || 'index, follow',
      og: {
        title: pageData.og_title || pageData.meta_title || contentRow.title,
        description: pageData.og_description || pageData.meta_description || '',
        image: pageData.og_image || '',
        url: `${site.site_url}${slug}`,
        type: 'website'
      },
      schema: schemaMarkup
    };

    setRenderDebugHeaders(req, res, pageData, content);

    // Render template
    const templateContext = {
      page: pageData,
      content,
      seo,
      site,
      menus
    };

    // For products, also pass as 'product' variable for template convenience
    if (contentType === 'products') {
      templateContext.product = pageData;
    }

    res.render(pageData.template_filename, templateContext);
  } catch (err) {
    console.error('Render error:', err);
    res.status(500).render('pages/500.njk', {
      title: 'Server Error',
      site: await getSiteSettings()
    });
  }
});

// Helper to get site settings as object
async function getSiteSettings() {
  try {
    const settings = await query('SELECT setting_key, setting_value FROM settings');
    const obj = {};
    settings.forEach(s => {
      obj[s.setting_key] = s.setting_value;
    });
    return obj;
  } catch (err) {
    return {
      site_name: 'WebWolf CMS',
      site_url: 'http://localhost:3000'
    };
  }
}

// Helper to get all published blocks with template info
async function getAllBlocks() {
  try {
    const blocks = await query(`
      SELECT b.*, t.filename as template_filename
      FROM blocks b
      LEFT JOIN templates t ON b.template_id = t.id
    `);
    return blocks;
  } catch (err) {
    console.error('Error fetching blocks:', err);
    return [];
  }
}

export default router;
