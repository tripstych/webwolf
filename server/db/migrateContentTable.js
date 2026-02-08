import 'dotenv/config';
import mysql from 'mysql2/promise';

const alterMigrations = [
  // Add content_id to pages table
  `ALTER TABLE pages ADD COLUMN content_id INT NULL AFTER template_id`,
  `ALTER TABLE pages ADD FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL`,

  // Add content_id to blocks table
  `ALTER TABLE blocks ADD COLUMN content_id INT NULL AFTER template_id`,
  `ALTER TABLE blocks ADD FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL`,

  // Drop old content column from pages (if it exists)
  `ALTER TABLE pages DROP COLUMN IF EXISTS content`,

  // Drop old content column from blocks (if it exists)
  `ALTER TABLE blocks DROP COLUMN IF EXISTS content`
];

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

    console.log('📦 Running content table migration...');

    for (const sql of alterMigrations) {
      try {
        await connection.query(sql);
        console.log('✅', sql.substring(0, 50) + '...');
      } catch (err) {
        // Ignore if column/constraint already exists
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('⚠️  Skipped (already exists):', sql.substring(0, 50) + '...');
        } else {
          throw err;
        }
      }
    }

    console.log('✅ Content table migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
