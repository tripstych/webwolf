import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'webwolf_cms'
    });

    console.log('📦 Adding module column to content table...');

    // Add module column if it doesn't exist
    try {
      await connection.query('ALTER TABLE content ADD COLUMN module VARCHAR(255)');
      console.log('✅ Added module column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      console.log('⚠️  module column already exists');
    }

    // Migrate existing data - extract module from slug
    console.log('📝 Migrating existing slugs...');
    const contents = await connection.query('SELECT id, slug FROM content WHERE slug IS NOT NULL AND module IS NULL');

    for (const [content] of contents) {
      let module = 'pages'; // default module
      let cleanSlug = content.slug;

      // Extract module from slug if it starts with /module/
      if (content.slug.startsWith('/')) {
        const parts = content.slug.slice(1).split('/');
        if (parts.length > 1 && ['pages', 'products', 'blocks'].includes(parts[0])) {
          module = parts[0];
          cleanSlug = '/' + parts.slice(1).join('/');
        }
      }

      console.log(`  - ${content.slug} → module: ${module}, slug: ${cleanSlug}`);

      await connection.query(
        'UPDATE content SET module = ?, slug = ? WHERE id = ?',
        [module, cleanSlug, content.id]
      );
    }

    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
