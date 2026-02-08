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

    console.log('📦 Renaming type columns to module...');

    // Rename type to module in content table
    try {
      await connection.query('ALTER TABLE content CHANGE COLUMN type module VARCHAR(50) NOT NULL');
      console.log('✅ Renamed content.type → content.module');
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️  column already renamed or does not exist');
      } else {
        throw e;
      }
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
