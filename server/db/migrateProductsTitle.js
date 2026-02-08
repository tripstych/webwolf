import 'dotenv/config';
import mysql from 'mysql2/promise';

const alterMigrations = [
  // Add title to products table
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL AFTER template_id`
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

    console.log('📦 Running products migration (adding title)...');

    for (const sql of alterMigrations) {
      try {
        await connection.query(sql);
        console.log('✅', sql.substring(0, 60) + '...');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
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
