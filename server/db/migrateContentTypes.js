import 'dotenv/config';
import mysql from 'mysql2/promise';
import { syncTemplatesToDb } from '../services/templateParser.js';

async function migrateContentTypes() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'webwolf_cms'
    });

    console.log('🔄 Running content types migration...');

    // Add content_type columns if they don't exist (for existing databases)
    try {
      await connection.query('ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT "pages" AFTER template_id');
      console.log('✅ Added content_type to pages table');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.warn('  Column may already exist, continuing...');
      }
    }

    try {
      await connection.query('ALTER TABLE blocks ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT "blocks" AFTER template_id');
      console.log('✅ Added content_type to blocks table');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.warn('  Column may already exist, continuing...');
      }
    }

    try {
      await connection.query('ALTER TABLE templates ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) AFTER filename');
      console.log('✅ Added content_type to templates table');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.warn('  Column may already exist, continuing...');
      }
    }

    // Create content_types table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS content_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(100) NOT NULL,
        plural_label VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'FileText',
        color VARCHAR(20) DEFAULT 'gray',
        menu_order INT DEFAULT 999,
        show_in_menu BOOLEAN DEFAULT TRUE,
        has_status BOOLEAN DEFAULT TRUE,
        has_seo BOOLEAN DEFAULT TRUE,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created/verified content_types table');

    // Seed default types if they don't exist
    await connection.query(`
      INSERT IGNORE INTO content_types (name, label, plural_label, icon, menu_order, has_status, has_seo, is_system) VALUES
      ('pages', 'Page', 'Pages', 'FileText', 1, TRUE, TRUE, TRUE),
      ('blocks', 'Block', 'Blocks', 'Boxes', 2, FALSE, FALSE, TRUE)
    `);
    console.log('✅ Seeded default content types');

    // Sync templates (will auto-discover and register new content types)
    console.log('🔄 Syncing templates and discovering content types...');
    const queryFn = async (sql, params) => {
      const [rows] = await connection.execute(sql, params || []);
      return rows;
    };

    const count = await syncTemplatesToDb(queryFn);
    console.log(`✅ Synced ${count} templates`);

    // Set content_type on existing pages that don't have it
    await connection.query('UPDATE pages SET content_type = "pages" WHERE content_type IS NULL OR content_type = ""');
    console.log('✅ Updated existing pages with content_type');

    // Set content_type on existing blocks that don't have it
    await connection.query('UPDATE blocks SET content_type = "blocks" WHERE content_type IS NULL OR content_type = ""');
    console.log('✅ Updated existing blocks with content_type');

    console.log('\n✨ Content types migration completed successfully!');
    console.log('You can now create new content types by creating folders in templates/');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrateContentTypes();
