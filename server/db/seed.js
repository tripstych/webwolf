import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, getPool } from './connection.js';

async function seed() {
  try {
    // Create admin user
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (email, password, name, role) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [email, hashedPassword, 'Admin', 'admin']
    );
    console.log(`✅ Admin user created: ${email}`);

    // Create default homepage template
    const homepageRegions = JSON.stringify([
      { name: 'hero_title', type: 'text', label: 'Hero Title' },
      { name: 'hero_subtitle', type: 'text', label: 'Hero Subtitle' },
      { name: 'hero_cta_text', type: 'text', label: 'CTA Button Text' },
      { name: 'hero_cta_link', type: 'text', label: 'CTA Button Link' },
      { name: 'intro_content', type: 'richtext', label: 'Introduction Content' },
      { name: 'features', type: 'repeater', label: 'Features', fields: [
        { name: 'title', type: 'text', label: 'Feature Title' },
        { name: 'description', type: 'textarea', label: 'Feature Description' },
        { name: 'icon', type: 'text', label: 'Icon Class' }
      ]}
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE regions = VALUES(regions)`,
      ['Homepage', 'pages/homepage.njk', 'Main landing page template', homepageRegions]
    );

    // Create default page template
    const pageRegions = JSON.stringify([
      { name: 'page_title', type: 'text', label: 'Page Title' },
      { name: 'page_content', type: 'richtext', label: 'Page Content' },
      { name: 'sidebar_content', type: 'richtext', label: 'Sidebar Content' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE regions = VALUES(regions)`,
      ['Standard Page', 'pages/standard.njk', 'Standard content page with sidebar', pageRegions]
    );

    // Create blog post template
    const blogRegions = JSON.stringify([
      { name: 'post_title', type: 'text', label: 'Post Title' },
      { name: 'featured_image', type: 'image', label: 'Featured Image' },
      { name: 'excerpt', type: 'textarea', label: 'Excerpt' },
      { name: 'post_content', type: 'richtext', label: 'Post Content' },
      { name: 'author', type: 'text', label: 'Author Name' },
      { name: 'tags', type: 'text', label: 'Tags (comma separated)' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE regions = VALUES(regions)`,
      ['Blog Post', 'pages/blog-post.njk', 'Blog article template', blogRegions]
    );

    // Insert default settings
    const defaultSettings = [
      ['site_name', 'WebWolf CMS'],
      ['site_tagline', 'SEO-Centric Content Management'],
      ['site_url', 'http://localhost:3000'],
      ['default_meta_title', 'WebWolf CMS'],
      ['default_meta_description', 'A powerful SEO-centric content management system'],
      ['google_analytics_id', ''],
      ['robots_txt', 'User-agent: *\nAllow: /']
    ];

    for (const [key, value] of defaultSettings) {
      await query(
        `INSERT INTO settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }
    console.log('✅ Default settings created');

    // Seed default content types
    await query(
      `INSERT INTO content_types (name, label, plural_label, icon, menu_order, has_status, has_seo, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), plural_label = VALUES(plural_label)`,
      ['pages', 'Page', 'Pages', 'FileText', 1, true, true, true]
    );

    await query(
      `INSERT INTO content_types (name, label, plural_label, icon, menu_order, has_status, has_seo, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), plural_label = VALUES(plural_label)`,
      ['blocks', 'Block', 'Blocks', 'Boxes', 2, false, false, true]
    );

    await query(
      `INSERT INTO content_types (name, label, plural_label, icon, menu_order, has_status, has_seo, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), plural_label = VALUES(plural_label)`,
      ['products', 'Product', 'Products', 'ShoppingCart', 3, true, true, false]
    );
    console.log('✅ Default content types created');

    // Create sample homepage
    const templates = await query('SELECT id FROM templates WHERE filename = ?', ['pages/homepage.njk']);
    if (templates && templates[0]) {
      const homeContent = {
        hero_title: 'Welcome to WebWolf CMS',
        hero_subtitle: 'Build SEO-optimized websites with ease',
        hero_cta_text: 'Get Started',
        hero_cta_link: '/about',
        intro_content: '<p>WebWolf CMS is a powerful, SEO-centric content management system built with React, Express, and Nunjucks.</p>',
        features: [
          { title: 'SEO First', description: 'Built with search engine optimization at its core', icon: 'search' },
          { title: 'Fast Rendering', description: 'Server-side rendered pages for optimal performance', icon: 'zap' },
          { title: 'Easy to Use', description: 'Intuitive admin interface powered by React', icon: 'smile' }
        ]
      };

      // Get or create content record
      let contentId;
      const existingContent = await query('SELECT id FROM content WHERE slug = ?', ['/pages/home']);

      if (existingContent && existingContent[0]) {
        contentId = existingContent[0].id;
        // Update existing content
        await query(
          'UPDATE content SET module = ?, title = ?, data = ? WHERE slug = ?',
          ['pages', 'Home', JSON.stringify(homeContent), '/pages/home']
        );
      } else {
        // Create new content
        const contentResult = await query(
          `INSERT INTO content (module, slug, title, data)
           VALUES (?, ?, ?, ?)`,
          ['pages', '/pages/home', 'Home', JSON.stringify(homeContent)]
        );
        contentId = contentResult.insertId;
      }

      await query(
        `INSERT INTO pages (template_id, content_id, status, meta_title, meta_description, created_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content_id = VALUES(content_id)`,
        [templates[0].id, contentId, 'published', 'Welcome to WebWolf CMS', 'A powerful SEO-centric content management system', 1]
      );
      console.log('✅ Sample homepage created');
    }

    console.log('🌱 Seeding completed successfully');
    const pool = getPool();
    await pool.end();
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
