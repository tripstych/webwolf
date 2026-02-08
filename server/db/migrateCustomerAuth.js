import 'dotenv/config';
import mysql from 'mysql2/promise';

const migrations = [
  // Add password field to customers table
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255)`,

  // Add email verification fields
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`,

  // Add password reset fields
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL`,

  // Add OAuth fields for future integration
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50)`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)`,

  // Add unique constraint on email (for login)
  `ALTER TABLE customers ADD UNIQUE INDEX IF NOT EXISTS unique_email (email)`,

  // Add index for password reset token
  `ALTER TABLE customers ADD INDEX IF NOT EXISTS idx_password_reset_token (password_reset_token)`
];

async function migrate() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'webwolf_cms';
    await connection.query(`USE \`${dbName}\``);

    console.log(`📦 Running customer authentication migrations on database: ${dbName}`);

    for (const sql of migrations) {
      try {
        await connection.query(sql);
        console.log(`✅ ${sql.substring(0, 60)}...`);
      } catch (err) {
        // Log warning but continue - some migrations may already exist
        console.warn(`⚠️  ${err.message.substring(0, 80)}`);
      }
    }

    console.log('✅ Customer authentication migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
