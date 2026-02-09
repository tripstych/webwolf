import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, getPool } from './connection.js';

async function seedDemo() {
  try {
    console.log('🔄 Flushing database...');

    // Disable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 0');

    // Delete all data in order of dependencies
    const tables = [
      'content_groups',
      'order_items',
      'orders',
      'addresses',
      'customers',
      'product_variants',
      'products',
      'pages',
      'blocks',
      'content',
      'content_types',
      'templates',
      'menu_items',
      'menus',
      'groups',
      'users',
      'settings'
    ];

    for (const table of tables) {
      try {
        await query(`DELETE FROM ${table}`);
        await query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (err) {
        // Table might not exist yet, that's ok
      }
    }

    // Re-enable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Database flushed');

    // ========== USERS ==========
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminResult = await query(
      `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`,
      [adminEmail, hashedPassword, 'Admin User', 'admin']
    );
    const adminUserId = adminResult.insertId;

    console.log(`✅ Admin user: ${adminEmail} / ${adminPassword}`);

    // ========== SETTINGS ==========
    console.log('⚙️ Creating site settings...');
    const settings = [
      ['site_name', 'Modern Apparel'],
      ['site_tagline', 'Premium Clothing & Lifestyle'],
      ['site_url', 'http://localhost:3000'],
      ['default_meta_title', 'Modern Apparel - Premium Clothing'],
      ['default_meta_description', 'Discover our curated collection of modern apparel and lifestyle products'],
      ['google_analytics_id', ''],
      ['robots_txt', 'User-agent: *\nAllow: /'],
      ['home_page_id', '1'],
      ['tax_rate', '0.08'],
      ['shipping_flat_rate', '9.99'],
      ['currency', 'USD'],
      ['stripe_public_key', 'pk_test_demo'],
      ['stripe_secret_key', 'sk_test_demo'],
      ['paypal_client_id', 'client_id_demo'],
      ['paypal_client_secret', 'secret_demo'],
      ['paypal_mode', 'sandbox']
    ];

    for (const [key, value] of settings) {
      await query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)`,
        [key, value]
      );
    }
    console.log('✅ Settings created');

    // ========== CONTENT TYPES ==========
    console.log('📝 Creating content types...');
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

    await query(
      `INSERT INTO content_types (name, label, plural_label, icon, menu_order, has_status, has_seo, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), plural_label = VALUES(plural_label)`,
      ['blog', 'Blog Post', 'Blog Posts', 'BookOpen', 4, true, true, false]
    );
    console.log('✅ Content types created');

    // ========== TEMPLATES ==========
    console.log('🎨 Creating templates...');

    const homepageRegions = JSON.stringify([
      { name: 'hero_title', type: 'text', label: 'Hero Title' },
      { name: 'hero_subtitle', type: 'text', label: 'Hero Subtitle' },
      { name: 'hero_cta_text', type: 'text', label: 'CTA Button Text' },
      { name: 'hero_cta_link', type: 'text', label: 'CTA Button Link' },
      { name: 'intro_content', type: 'richtext', label: 'Introduction Content' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), regions = VALUES(regions)`,
      ['Homepage', 'pages/homepage.njk', 'Homepage with hero section', homepageRegions]
    );

    const standardPageRegions = JSON.stringify([
      { name: 'page_content', type: 'richtext', label: 'Page Content' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), regions = VALUES(regions)`,
      ['Standard Page', 'pages/standard.njk', 'Standard content page', standardPageRegions]
    );

    const productTemplateRegions = JSON.stringify([
      { name: 'description', type: 'richtext', label: 'Product Description' },
      { name: 'features', type: 'richtext', label: 'Features & Benefits' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), regions = VALUES(regions)`,
      ['Product Page', 'products/product-single.njk', 'Product detail page', productTemplateRegions]
    );

    const blogTemplateRegions = JSON.stringify([
      { name: 'featured_image', type: 'image', label: 'Featured Image' },
      { name: 'excerpt', type: 'textarea', label: 'Excerpt' },
      { name: 'content', type: 'richtext', label: 'Article Content' },
      { name: 'author', type: 'text', label: 'Author Name' }
    ]);

    await query(
      `INSERT INTO templates (name, filename, description, regions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), regions = VALUES(regions)`,
      ['Blog Post', 'blog/blog-post.njk', 'Blog article template', blogTemplateRegions]
    );

    console.log('✅ Templates created');

    // ========== PAGES ==========
    console.log('📄 Creating pages...');

    const homeContent = {
      hero_title: 'Welcome to Modern Apparel',
      hero_subtitle: 'Discover premium clothing and lifestyle products',
      hero_cta_text: 'Shop Now',
      hero_cta_link: '/products',
      intro_content: '<p>We curate the finest selection of modern apparel for the contemporary lifestyle. From everyday essentials to statement pieces.</p>'
    };

    const homeResult = await query(
      `INSERT INTO content (module, slug, title, data)
       VALUES (?, ?, ?, ?)`,
      ['pages', '/', 'Home', JSON.stringify(homeContent)]
    );
    const homeContentId = homeResult.insertId;

    const templates = await query('SELECT id FROM templates WHERE filename = ?', ['pages/homepage.njk']);

    await query(
      `INSERT INTO pages (template_id, content_id, title, slug, status, meta_title, meta_description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [templates[0].id, homeContentId, 'Home', '/', 'published', 'Modern Apparel - Premium Clothing', 'Discover our curated collection of premium apparel and lifestyle products', adminUserId]
    );

    // About Page
    const aboutContent = {
      page_content: '<h2>About Modern Apparel</h2><p>Since 2020, we\'ve been dedicated to bringing you the finest quality clothing and lifestyle products. Our curated selection focuses on sustainable materials, timeless designs, and exceptional comfort.</p><p>Every piece in our collection is carefully selected to meet our high standards for quality and style.</p>'
    };

    const aboutResult = await query(
      `INSERT INTO content (module, slug, title, data)
       VALUES (?, ?, ?, ?)`,
      ['pages', '/about', 'About Us', JSON.stringify(aboutContent)]
    );

    const stdTemplate = await query('SELECT id FROM templates WHERE filename = ?', ['pages/standard.njk']);

    if (!stdTemplate || !stdTemplate[0]) {
      throw new Error('Standard template not found');
    }

    await query(
      `INSERT INTO pages (template_id, content_id, title, slug, status, meta_title, meta_description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [stdTemplate[0].id, aboutResult.insertId, 'About Us', '/about', 'published', 'About Modern Apparel', 'Learn about our mission and values', adminUserId]
    );

    console.log('✅ Pages created');

    // ========== PRODUCTS ==========
    console.log('🛍️ Creating products...');

    const products = [
      {
        sku: 'CLASSIC-TEE-001',
        title: 'Classic Crew Neck T-Shirt',
        slug: '/products/classic-crew-neck-tshirt',
        price: 39.99,
        compare_at_price: 49.99,
        description: 'Timeless crew neck t-shirt in premium cotton. Perfect for any wardrobe.'
      },
      {
        sku: 'DENIM-BLUE-001',
        title: 'Premium Denim Jeans',
        slug: '/products/premium-denim-jeans',
        price: 89.99,
        compare_at_price: 119.99,
        description: 'Classic fit denim with modern comfort. Built to last.'
      },
      {
        sku: 'LEATHER-JACKET-001',
        title: 'Leather Jacket',
        slug: '/products/leather-jacket',
        price: 199.99,
        compare_at_price: 249.99,
        description: 'Premium leather jacket with timeless style.'
      },
      {
        sku: 'HOODIE-GRAY-001',
        title: 'Comfort Hoodie',
        slug: '/products/comfort-hoodie',
        price: 59.99,
        compare_at_price: 79.99,
        description: 'Soft and cozy hoodie, perfect for layering.'
      },
      {
        sku: 'SNEAKER-WHITE-001',
        title: 'White Leather Sneakers',
        slug: '/products/white-leather-sneakers',
        price: 119.99,
        compare_at_price: 149.99,
        description: 'Clean white leather sneakers with premium comfort.'
      }
    ];

    const productTemplate = await query('SELECT id FROM templates WHERE filename = ?', ['products/product-single.njk']);
    const productIds = [];

    for (const prod of products) {
      const contentResult = await query(
        `INSERT INTO content (module, slug, title, data)
         VALUES (?, ?, ?, ?)`,
        ['products', prod.slug, prod.title, JSON.stringify({ description: prod.description })]
      );

      const prodResult = await query(
        `INSERT INTO products (sku, price, compare_at_price, inventory_quantity, inventory_tracking, status, content_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prod.sku, prod.price, prod.compare_at_price, 50, true, 'active', contentResult.insertId]
      );

      productIds.push(prodResult.insertId);
    }

    console.log('✅ Products created');

    // ========== PRODUCT VARIANTS ==========
    console.log('🎨 Creating product variants...');

    // T-shirt variants (sizes)
    const tshirtId = productIds[0];
    const tshirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    for (const size of tshirtSizes) {
      await query(
        `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, option1_name, option1_value, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tshirtId, `Classic Tee - ${size}`, `CLASSIC-TEE-${size}`, 39.99, 20, 'Size', size, 1]
      );
    }

    // Jeans variants (sizes and colors)
    const jeansId = productIds[1];
    const jeansSizes = ['28', '30', '32', '34', '36', '38'];
    for (let i = 0; i < jeansSizes.length; i++) {
      await query(
        `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, option1_name, option1_value, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [jeansId, `Premium Denim - ${jeansSizes[i]}`, `DENIM-BLUE-${jeansSizes[i]}`, 89.99, 15, 'Size', jeansSizes[i], i + 1]
      );
    }

    // Leather Jacket variants (sizes)
    const jacketId = productIds[2];
    const jacketSizes = ['XS', 'S', 'M', 'L', 'XL'];
    for (const size of jacketSizes) {
      await query(
        `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, option1_name, option1_value, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [jacketId, `Leather Jacket - ${size}`, `LEATHER-JACKET-${size}`, 199.99, 10, 'Size', size, 1]
      );
    }

    // Hoodie variants (sizes and colors)
    const hoodieId = productIds[3];
    const hoodieColors = ['Gray', 'Black', 'Navy', 'White'];
    const hoodieSizes = ['S', 'M', 'L', 'XL'];
    let position = 1;
    for (const color of hoodieColors) {
      for (const size of hoodieSizes) {
        await query(
          `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, option1_name, option1_value, option2_name, option2_value, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [hoodieId, `${color} Hoodie - ${size}`, `HOODIE-${color}-${size}`, 59.99, 12, 'Color', color, 'Size', size, position++]
        );
      }
    }

    // Sneaker variants (sizes)
    const sneakerId = productIds[4];
    const sneakerSizes = ['6', '7', '8', '9', '10', '11', '12', '13'];
    for (let i = 0; i < sneakerSizes.length; i++) {
      await query(
        `INSERT INTO product_variants (product_id, title, sku, price, inventory_quantity, option1_name, option1_value, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sneakerId, `White Sneaker - Size ${sneakerSizes[i]}`, `SNEAKER-WHITE-${sneakerSizes[i]}`, 119.99, 25, 'Size', sneakerSizes[i], i + 1]
      );
    }

    console.log('✅ Product variants created');

    // ========== CUSTOMERS ==========
    console.log('👥 Creating customers...');

    const customers = [
      { email: 'john@example.com', first_name: 'John', last_name: 'Anderson', phone: '555-0101' },
      { email: 'sarah@example.com', first_name: 'Sarah', last_name: 'Martinez', phone: '555-0102' },
      { email: 'michael@example.com', first_name: 'Michael', last_name: 'Chen', phone: '555-0103' },
      { email: 'emma@example.com', first_name: 'Emma', last_name: 'Wilson', phone: '555-0104' },
      { email: 'david@example.com', first_name: 'David', last_name: 'Taylor', phone: '555-0105' }
    ];

    const customerIds = [];

    for (const cust of customers) {
      const result = await query(
        `INSERT INTO customers (email, first_name, last_name, phone)
         VALUES (?, ?, ?, ?)`,
        [cust.email, cust.first_name, cust.last_name, cust.phone]
      );
      customerIds.push(result.insertId);
    }

    console.log('✅ Customers created');

    // ========== ADDRESSES ==========
    console.log('🏠 Creating addresses...');

    const addresses = [
      { customerId: customerIds[0], first_name: 'John', last_name: 'Anderson', address1: '123 Main St', city: 'New York', province: 'NY', postal_code: '10001', country: 'US' },
      { customerId: customerIds[1], first_name: 'Sarah', last_name: 'Martinez', address1: '456 Oak Ave', city: 'Los Angeles', province: 'CA', postal_code: '90001', country: 'US' },
      { customerId: customerIds[2], first_name: 'Michael', last_name: 'Chen', address1: '789 Pine Rd', city: 'San Francisco', province: 'CA', postal_code: '94101', country: 'US' }
    ];

    for (const addr of addresses) {
      await query(
        `INSERT INTO addresses (customer_id, type, first_name, last_name, address1, city, province, postal_code, country, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [addr.customerId, 'shipping', addr.first_name, addr.last_name, addr.address1, addr.city, addr.province, addr.postal_code, addr.country, true]
      );
    }

    console.log('✅ Addresses created');

    // ========== ORDERS ==========
    console.log('📦 Creating orders...');

    const orders = [
      {
        customer_id: customerIds[0],
        email: customers[0].email,
        subtotal: 129.98,
        shipping: 9.99,
        tax: 10.40,
        total: 150.37,
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'stripe',
        shipping_method: 'Standard',
        items: [
          { product_id: productIds[0], variant_id: 1, title: 'Classic Crew Neck T-Shirt', sku: 'CLASSIC-TEE-M', price: 39.99, quantity: 2 },
          { product_id: productIds[4], variant_id: 21, title: 'White Leather Sneakers', sku: 'SNEAKER-WHITE-10', price: 119.99, quantity: 0 }
        ]
      },
      {
        customer_id: customerIds[1],
        email: customers[1].email,
        subtotal: 89.99,
        shipping: 9.99,
        tax: 7.20,
        total: 107.18,
        status: 'processing',
        payment_status: 'paid',
        payment_method: 'paypal',
        shipping_method: 'Standard',
        items: [
          { product_id: productIds[1], variant_id: 7, title: 'Premium Denim Jeans', sku: 'DENIM-BLUE-32', price: 89.99, quantity: 1 }
        ]
      },
      {
        customer_id: customerIds[2],
        email: customers[2].email,
        subtotal: 259.97,
        shipping: 9.99,
        tax: 20.80,
        total: 290.76,
        status: 'shipped',
        payment_status: 'paid',
        payment_method: 'stripe',
        shipping_method: 'Express',
        tracking_number: 'TRK123456789',
        items: [
          { product_id: productIds[2], variant_id: 13, title: 'Leather Jacket', sku: 'LEATHER-JACKET-L', price: 199.99, quantity: 1 },
          { product_id: productIds[0], variant_id: 2, title: 'Classic Crew Neck T-Shirt', sku: 'CLASSIC-TEE-L', price: 39.99, quantity: 1 }
        ]
      },
      {
        customer_id: customerIds[3],
        email: customers[3].email,
        subtotal: 119.98,
        shipping: 0,
        tax: 9.60,
        total: 129.58,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'stripe',
        shipping_method: 'Standard',
        items: [
          { product_id: productIds[3], variant_id: 17, title: 'Comfort Hoodie', sku: 'HOODIE-Black-M', price: 59.99, quantity: 2 }
        ]
      }
    ];

    for (const order of orders) {
      const orderNumber = `#${1001 + Math.floor(Math.random() * 1000)}`;
      const billingAddress = JSON.stringify({
        first_name: 'John',
        last_name: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        province: 'NY',
        postal_code: '10001',
        country: 'US'
      });

      const orderResult = await query(
        `INSERT INTO orders (order_number, customer_id, email, status, payment_status, subtotal, shipping, tax, total, payment_method, billing_address, shipping_address, shipping_method, tracking_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderNumber, order.customer_id, order.email, order.status, order.payment_status, order.subtotal, order.shipping, order.tax, order.total, order.payment_method, billingAddress, billingAddress, order.shipping_method, order.tracking_number || null]
      );

      // Add order items
      for (const item of order.items) {
        if (item.quantity > 0) {
          await query(
            `INSERT INTO order_items (order_id, product_id, variant_id, product_title, sku, price, quantity, subtotal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderResult.insertId, item.product_id, item.variant_id, item.title, item.sku, item.price, item.quantity, item.price * item.quantity]
          );
        }
      }
    }

    console.log('✅ Orders created');

    // ========== BLOG POSTS ==========
    console.log('📰 Creating blog posts...');

    const blogPosts = [
      {
        title: 'The Art of Minimalist Fashion',
        slug: '/blog/minimalist-fashion',
        excerpt: 'Discover how to build a timeless wardrobe with fewer pieces.',
        content: '<p>Minimalist fashion is about quality over quantity. Focus on neutral colors, classic silhouettes, and versatile pieces that work together...</p>'
      },
      {
        title: 'Sustainable Style: Making Ethical Choices',
        slug: '/blog/sustainable-style',
        excerpt: 'Learn about sustainable fashion and how to make better choices.',
        content: '<p>Sustainable fashion is becoming increasingly important. By choosing quality pieces that last, you reduce waste and support ethical brands...</p>'
      }
    ];

    const blogTemplate = await query('SELECT id FROM templates WHERE filename = ?', ['blog/blog-post.njk']);

    for (const post of blogPosts) {
      const contentData = {
        excerpt: post.excerpt,
        content: post.content,
        author: 'Modern Apparel Team'
      };

      const contentResult = await query(
        `INSERT INTO content (module, slug, title, data)
         VALUES (?, ?, ?, ?)`,
        ['blog', post.slug, post.title, JSON.stringify(contentData)]
      );

      await query(
        `INSERT INTO pages (template_id, content_id, title, slug, status, meta_title, meta_description, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [blogTemplate[0].id, contentResult.insertId, post.title, post.slug, 'published', post.title, post.excerpt, adminUserId]
      );
    }

    console.log('✅ Blog posts created');

    // ========== MENUS ==========
    console.log('📋 Creating menus...');

    const mainMenu = await query(
      `INSERT INTO menus (name, slug) VALUES (?, ?)`,
      ['Main Navigation', 'main-nav']
    );

    const menuItems = [
      { menu_id: mainMenu.insertId, title: 'Home', url: '/', position: 1 },
      { menu_id: mainMenu.insertId, title: 'Shop', url: '/products', position: 2 },
      { menu_id: mainMenu.insertId, title: 'About', url: '/about', position: 3 },
      { menu_id: mainMenu.insertId, title: 'Blog', url: '/blog', position: 4 }
    ];

    for (const item of menuItems) {
      await query(
        `INSERT INTO menu_items (menu_id, title, url, position) VALUES (?, ?, ?, ?)`,
        [item.menu_id, item.title, item.url, item.position]
      );
    }

    console.log('✅ Menus created');

    // ========== GROUPS ==========
    console.log('🏷️ Creating groups...');

    const groupResult = await query(
      `INSERT INTO \`groups\` (name) VALUES (?)`,
      ['Featured Products']
    );

    // Add some products to group
    await query(
      `INSERT INTO content_groups (group_id, content_id) VALUES (?, ?)`,
      [groupResult.insertId, 1]
    );

    await query(
      `INSERT INTO content_groups (group_id, content_id) VALUES (?, ?)`,
      [groupResult.insertId, 4]
    );

    console.log('✅ Groups created');

    console.log('\n🎉 Demo database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log('  - Admin User: admin@example.com / admin123');
    console.log('  - Site: Modern Apparel (Premium Clothing Store)');
    console.log('  - Pages: 2 (Home, About)');
    console.log('  - Products: 5 with variants');
    console.log('  - Orders: 4 (various statuses)');
    console.log('  - Customers: 5');
    console.log('  - Blog Posts: 2');
    console.log('  - Menus: 1');
    console.log('  - Groups: 1\n');

    const pool = getPool();
    await pool.end();
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedDemo();
