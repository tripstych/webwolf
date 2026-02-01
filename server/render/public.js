import { Router } from 'express';
import { query } from '../db/connection.js';
import { getAllMenus } from '../services/menuService.js';

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
    
    const pages = await query(
      'SELECT slug, updated_at FROM pages WHERE status = ? ORDER BY updated_at DESC',
      ['published']
    );
    
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

// Render pages
router.get('*', async (req, res) => {
  try {
    // Normalize path
    let slug = req.path;
    if (slug !== '/' && slug.endsWith('/')) {
      slug = slug.slice(0, -1);
    }

    if (shouldLogRender(req)) {
      logRender('request', { path: req.path, normalizedSlug: slug });
    }
    
    // Get page data
    const pages = await query(`
      SELECT p.*, t.filename as template_filename
      FROM pages p
      LEFT JOIN templates t ON p.template_id = t.id
      WHERE p.slug = ? AND p.status = 'published'
    `, [slug]);

    if (shouldLogRender(req)) {
      logRender('db_match', {
        normalizedSlug: slug,
        matches: pages.length,
        ids: pages.map(p => p.id)
      });
    }
    
    if (!pages[0]) {
      // Try to render 404 template
      return res.status(404).render('pages/404.njk', {
        title: 'Page Not Found',
        site: await getSiteSettings()
      });
    }
    
    const page = pages[0];
    
    // Parse content JSON
    const content = parseJsonField(page.content) || {};

    if (shouldLogRender(req)) {
      const features = content?.features;
      logRender('selected_page', {
        id: page.id,
        slug: page.slug,
        template: page.template_filename,
        featuresType: features === null ? 'null' : typeof features,
        featuresIsArray: Array.isArray(features),
        featuresLength: Array.isArray(features) ? features.length : 0
      });
    }
    
    // Parse schema markup
    const schemaMarkup = parseJsonField(page.schema_markup);
    
    // Get site settings and menus
    const site = await getSiteSettings();
    const menus = await getAllMenus();
    
    // Build SEO data
    const seo = {
      title: page.meta_title || page.title,
      description: page.meta_description || '',
      canonical: page.canonical_url || `${site.site_url}${page.slug}`,
      robots: page.robots || 'index, follow',
      og: {
        title: page.og_title || page.meta_title || page.title,
        description: page.og_description || page.meta_description || '',
        image: page.og_image || '',
        url: `${site.site_url}${page.slug}`,
        type: 'website'
      },
      schema: schemaMarkup
    };

    setRenderDebugHeaders(req, res, page, content);
    
    // Render template
    res.render(page.template_filename, {
      page,
      content,
      seo,
      site,
      menus
    });
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

export default router;
