import 'dotenv/config';
import mysql from 'mysql2/promise';

const alterMigrations = [
  // Add content_id to products table
  `ALTER TABLE products ADD COLUMN content_id INT NULL AFTER id`,
  `ALTER TABLE products ADD FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE`,

  // Drop the old page_id foreign key first
  `ALTER TABLE products DROP FOREIGN KEY products_ibfk_1`,

  // Then drop the page_id column
  `ALTER TABLE products DROP COLUMN IF EXISTS page_id`
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

    console.log('📦 Running products migration (adding content_id)...');

    for (const sql of alterMigrations) {
      try {
        await connection.query(sql);
        console.log('✅', sql.substring(0, 60) + '...');
      } catch (err) {
        // Ignore if column already exists
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('⚠️  Skipped (already exists):', sql.substring(0, 60) + '...');
        } else {
          throw err;
        }
      }
    }

    console.log('✅ Products migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
