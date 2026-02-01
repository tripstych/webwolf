import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import nunjucks from 'nunjucks';

import { initDb, query } from '../db/connection.js';
import { getAllMenus } from '../services/menuService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const templatesDir = path.join(repoRoot, 'templates');

function parseArgs(argv) {
  const args = {
    outDir: path.join(repoRoot, 'dist-static')
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out' || a === '--outDir') {
      args.outDir = path.resolve(argv[i + 1] || args.outDir);
      i += 1;
      continue;
    }
  }

  return args;
}

function addNunjucksFilters(env) {
  env.addFilter('truncate', (str, length) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  });

  env.addFilter('stripHtml', (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
  });

  env.addFilter('date', (date, format = 'YYYY-MM-DD') => {
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
}

async function safeRm(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

async function copyDirIfExists(src, dest) {
  try {
    const stat = await fs.stat(src);
    if (!stat.isDirectory()) return;

    if (typeof fs.cp === 'function') {
      await fs.cp(src, dest, { recursive: true });
      return;
    }

    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(src, entry.name);
      const to = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDirIfExists(from, to);
      } else if (entry.isFile()) {
        await fs.copyFile(from, to);
      }
    }
  } catch {
    return;
  }
}

async function getSiteSettings() {
  try {
    const settings = await query('SELECT setting_key, setting_value FROM settings');
    const obj = {};
    settings.forEach(s => {
      obj[s.setting_key] = s.setting_value;
    });
    return obj;
  } catch {
    return {
      site_name: 'WebWolf CMS',
      site_url: process.env.SITE_URL || 'http://localhost:3000'
    };
  }
}

function slugToFilePath(outDir, slug) {
  const normalized = (!slug || slug === '/') ? '/' : slug;
  const trimmed = normalized.startsWith('/') ? normalized.slice(1) : normalized;

  if (trimmed === '') {
    return path.join(outDir, 'index.html');
  }

  return path.join(outDir, trimmed, 'index.html');
}

async function writeFileEnsuringDir(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function renderTemplate(env, template, context) {
  return await new Promise((resolve, reject) => {
    env.render(template, context, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

async function generateRobotsTxt() {
  try {
    const settings = await query('SELECT setting_value FROM settings WHERE setting_key = ?', ['robots_txt']);
    return settings[0]?.setting_value || 'User-agent: *\nAllow: /';
  } catch {
    return 'User-agent: *\nAllow: /';
  }
}

async function generateSitemapXml(siteUrl) {
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

  return xml;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.outDir;

  await initDb();

  const env = nunjucks.configure(templatesDir, {
    autoescape: true,
    watch: false
  });
  addNunjucksFilters(env);

  await safeRm(outDir);
  await fs.mkdir(outDir, { recursive: true });

  const site = await getSiteSettings();
  const siteUrl = site.site_url || process.env.SITE_URL || 'http://localhost:3000';
  const menus = await getAllMenus();

  const pages = await query(`
    SELECT p.*, t.filename as template_filename
    FROM pages p
    LEFT JOIN templates t ON p.template_id = t.id
    WHERE p.status = 'published'
  `);

  const manifest = [];

  for (const page of pages) {
    let content = {};
    if (page.content) {
      try {
        content = JSON.parse(page.content);
      } catch {
        content = {};
      }
    }

    let schemaMarkup = null;
    if (page.schema_markup) {
      try {
        schemaMarkup = JSON.parse(page.schema_markup);
      } catch {
        schemaMarkup = null;
      }
    }

    const seo = {
      title: page.meta_title || page.title,
      description: page.meta_description || '',
      canonical: page.canonical_url || `${siteUrl}${page.slug}`,
      robots: page.robots || 'index, follow',
      og: {
        title: page.og_title || page.meta_title || page.title,
        description: page.og_description || page.meta_description || '',
        image: page.og_image || '',
        url: `${siteUrl}${page.slug}`,
        type: 'website'
      },
      schema: schemaMarkup
    };

    if (!page.template_filename) {
      throw new Error(`Missing template_filename for page id=${page.id} slug=${page.slug}`);
    }

    const html = await renderTemplate(env, page.template_filename, {
      page,
      content,
      seo,
      site,
      menus
    });

    const filePath = slugToFilePath(outDir, page.slug);
    await writeFileEnsuringDir(filePath, html);

    manifest.push({ slug: page.slug, file: path.relative(outDir, filePath) });
  }

  try {
    const html404 = await renderTemplate(env, 'pages/404.njk', { title: 'Page Not Found', site });
    await writeFileEnsuringDir(path.join(outDir, '404.html'), html404);
  } catch {
    await writeFileEnsuringDir(path.join(outDir, '404.html'), '<h1>404</h1>');
  }

  const robotsTxt = await generateRobotsTxt();
  await writeFileEnsuringDir(path.join(outDir, 'robots.txt'), robotsTxt);

  const sitemapXml = await generateSitemapXml(siteUrl);
  await writeFileEnsuringDir(path.join(outDir, 'sitemap.xml'), sitemapXml);

  await copyDirIfExists(path.join(repoRoot, 'uploads'), path.join(outDir, 'uploads'));
  await copyDirIfExists(path.join(repoRoot, 'public'), path.join(outDir, 'public'));

  await writeFileEnsuringDir(path.join(outDir, 'export-manifest.json'), JSON.stringify({ exportedAt: new Date().toISOString(), pages: manifest }, null, 2));

  console.log(`✅ Static export complete: ${outDir}`);
  console.log(`   Pages exported: ${manifest.length}`);
}

main().catch((err) => {
  console.error('❌ Static export failed:', err);
  process.exit(1);
});
