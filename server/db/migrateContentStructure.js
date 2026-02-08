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

    console.log('📦 Migrating title and slug to content table columns...');

    // 1. Add title and slug columns to content table if they don't exist
    console.log('  - Adding title and slug columns to content table...');
    try {
      await connection.query('ALTER TABLE content ADD COLUMN title VARCHAR(255)');
      console.log('    ✅ Added title column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      console.log('    ⚠️  title column already exists');
    }

    try {
      await connection.query('ALTER TABLE content ADD COLUMN slug VARCHAR(255) UNIQUE');
      console.log('    ✅ Added slug column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      console.log('    ⚠️  slug column already exists');
    }

    // 2. Migrate pages: move title and slug to content columns
    console.log('  - Migrating pages...');
    const pages = await connection.query(
      `SELECT p.id, p.title, p.slug, p.content_id FROM pages p WHERE p.title IS NOT NULL OR p.slug IS NOT NULL`
    );

    for (const [page] of pages) {
      if (page.content_id) {
        // Update existing content record
        await connection.query(
          'UPDATE content SET title = ?, slug = ? WHERE id = ?',
          [page.title, page.slug, page.content_id]
        );
      } else {
        // Create new content record
        const result = await connection.query(
          'INSERT INTO content (type, title, slug, data) VALUES (?, ?, ?, ?)',
          ['pages', page.title, page.slug, '{}']
        );
        const contentId = result[0].insertId;
        await connection.query(
          'UPDATE pages SET content_id = ? WHERE id = ?',
          [contentId, page.id]
        );
      }
    }

    // 3. Migrate products: move title to content column
    console.log('  - Migrating products...');
    const products = await connection.query(
      `SELECT p.id, p.title, p.content_id FROM products p WHERE p.title IS NOT NULL`
    );

    for (const [product] of products) {
      if (product.content_id) {
        // Update existing content record
        await connection.query(
          'UPDATE content SET title = ? WHERE id = ?',
          [product.title, product.content_id]
        );
      } else {
        // Create new content record
        const result = await connection.query(
          'INSERT INTO content (type, title, data) VALUES (?, ?, ?)',
          ['products', product.title, '{}']
        );
        const contentId = result[0].insertId;
        await connection.query(
          'UPDATE products SET content_id = ? WHERE id = ?',
          [contentId, product.id]
        );
      }
    }

    // 4. Drop columns from pages table
    console.log('  - Removing title and slug from pages table...');
    try {
      await connection.query('ALTER TABLE pages DROP KEY pages_slug_unique');
    } catch (e) {
      // Key might not exist
    }

    try {
      await connection.query('ALTER TABLE pages DROP COLUMN title');
      console.log('    ✅ Removed title column');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      console.log('    ⚠️  title column already removed');
    }

    try {
      await connection.query('ALTER TABLE pages DROP COLUMN slug');
      console.log('    ✅ Removed slug column');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      console.log('    ⚠️  slug column already removed');
    }

    // 5. Drop title column from products table
    console.log('  - Removing title from products table...');
    try {
      await connection.query('ALTER TABLE products DROP COLUMN title');
      console.log('    ✅ Removed title column');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      console.log('    ⚠️  title column already removed');
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
