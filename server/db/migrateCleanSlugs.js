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

    console.log('📦 Populating module column from slug...');

    const contents = await connection.query('SELECT id, slug, type FROM content WHERE slug IS NOT NULL');

    for (const [content] of contents) {
      let module = content.type || 'pages'; // fallback to existing type

      // Parse module from slug if it has a prefix
      const prefixMatch = content.slug?.match(/^\/([a-z]+)\//);
      if (prefixMatch) {
        module = prefixMatch[1];
      }

      console.log(`  - "${content.slug}" → module: ${module}`);

      await connection.query(
        'UPDATE content SET module = ? WHERE id = ?',
        [module, content.id]
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
