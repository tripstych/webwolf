/**
 * Template Extensions
 *
 * Registers global Nunjucks functions for template embeds and utilities.
 * Currently includes product lookup functions for embedding products in any template.
 * These functions allow modular access to product data without tight coupling.
 */

export default function registerTemplateExtensions(nunjucksEnv, queryFn) {
  /**
   * Get a single product by ID
   * @param {number} productId - The product ID
   * @returns {Promise<Object|null>} Product object or null if not found
   */
  nunjucksEnv.addGlobal('getProduct', async (productId) => {
    try {
      const results = await queryFn(
        `SELECT p.*, c.slug, c.title as content_title
         FROM products p
         LEFT JOIN content c ON p.content_id = c.id
         WHERE p.id = ?`,
        [productId]
      );
      if (results[0]) {
        // Map content_title to title for consistency
        if (results[0].content_title && !results[0].title) {
          results[0].title = results[0].content_title;
        }
        return results[0];
      }
      return null;
    } catch (err) {
      console.error(`Error fetching product ${productId}:`, err);
      return null;
    }
  });

  /**
   * Get a single product by slug
   * @param {string} slug - The product slug (e.g., '/products/cool-shirt')
   * @returns {Promise<Object|null>} Product object or null if not found
   */
  nunjucksEnv.addGlobal('getProductBySlug', async (slug) => {
    try {
      const results = await queryFn(
        `SELECT p.*, c.slug, c.title as content_title
         FROM products p
         LEFT JOIN content c ON p.content_id = c.id
         WHERE c.slug = ?`,
        [slug]
      );
      if (results[0]) {
        // Map content_title to title for consistency
        if (results[0].content_title && !results[0].title) {
          results[0].title = results[0].content_title;
        }
        return results[0];
      }
      return null;
    } catch (err) {
      console.error(`Error fetching product by slug ${slug}:`, err);
      return null;
    }
  });

  /**
   * Get multiple products by their IDs
   * @param {number[]} productIds - Array of product IDs
   * @returns {Promise<Object[]>} Array of product objects
   */
  nunjucksEnv.addGlobal('getProductsByIds', async (productIds) => {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return [];
      }

      const placeholders = productIds.map(() => '?').join(',');
      const results = await queryFn(
        `SELECT p.*, c.slug, c.title as content_title
         FROM products p
         LEFT JOIN content c ON p.content_id = c.id
         WHERE p.id IN (${placeholders})`,
        productIds
      );

      // Map content_title to title for consistency
      return results.map(product => ({
        ...product,
        title: product.content_title || product.title
      }));
    } catch (err) {
      console.error('Error fetching products by IDs:', err);
      return [];
    }
  });

  /**
   * Get active products (limit defaults to 10)
   * @param {string} category - Category filter (currently unused, for future expansion)
   * @param {number} limit - Number of products to return
   * @returns {Promise<Object[]>} Array of active product objects
   */
  nunjucksEnv.addGlobal('getProductsByCategory', async (category, limit = 10) => {
    try {
      const results = await queryFn(
        `SELECT p.*, c.slug, c.title as content_title
         FROM products p
         LEFT JOIN content c ON p.content_id = c.id
         WHERE p.status = 'active'
         LIMIT ?`,
        [limit]
      );

      // Map content_title to title for consistency
      return results.map(product => ({
        ...product,
        title: product.content_title || product.title
      }));
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  });

  /**
   * Get a single page by ID
   * @param {number} pageId - The page ID
   * @returns {Promise<Object|null>} Page object or null if not found
   */
  nunjucksEnv.addGlobal('getPage', async (pageId) => {
    try {
      const results = await queryFn(
        `SELECT c.*, p.status, p.meta_title, p.meta_description
         FROM content c
         LEFT JOIN pages p ON c.id = p.content_id
         WHERE c.id = ?`,
        [pageId]
      );
      if (results[0]) {
        return results[0];
      }
      return null;
    } catch (err) {
      console.error(`Error fetching page ${pageId}:`, err);
      return null;
    }
  });

  /**
   * Get a single page by slug
   * @param {string} slug - The page slug (e.g., '/pages/about')
   * @returns {Promise<Object|null>} Page object or null if not found
   */
  nunjucksEnv.addGlobal('getPageBySlug', async (slug) => {
    try {
      const results = await queryFn(
        `SELECT c.*, p.status, p.meta_title, p.meta_description
         FROM content c
         LEFT JOIN pages p ON c.id = p.content_id
         WHERE c.slug = ?`,
        [slug]
      );
      if (results[0]) {
        return results[0];
      }
      return null;
    } catch (err) {
      console.error(`Error fetching page by slug ${slug}:`, err);
      return null;
    }
  });

  /**
   * Get multiple pages by their IDs
   * @param {number[]} pageIds - Array of page IDs
   * @returns {Promise<Object[]>} Array of page objects
   */
  nunjucksEnv.addGlobal('getPagesByIds', async (pageIds) => {
    try {
      if (!Array.isArray(pageIds) || pageIds.length === 0) {
        return [];
      }

      const placeholders = pageIds.map(() => '?').join(',');
      const results = await queryFn(
        `SELECT c.*, p.status, p.meta_title, p.meta_description
         FROM content c
         LEFT JOIN pages p ON c.id = p.content_id
         WHERE c.id IN (${placeholders})`,
        pageIds
      );

      return results;
    } catch (err) {
      console.error('Error fetching pages by IDs:', err);
      return [];
    }
  });

  /**
   * Get pages by content type
   * @param {string} type - The content type (e.g., 'pages', 'blog', 'guides')
   * @param {number} limit - Number of pages to return
   * @returns {Promise<Object[]>} Array of page objects
   */
  nunjucksEnv.addGlobal('getPagesByType', async (type, limit = 10) => {
    try {
      const results = await queryFn(
        `SELECT c.*, p.status, p.meta_title, p.meta_description
         FROM content c
         LEFT JOIN pages p ON c.id = p.content_id
         WHERE c.module = ? AND (p.status = 'published' OR p.status IS NULL)
         LIMIT ?`,
        [type, limit]
      );

      return results;
    } catch (err) {
      console.error(`Error fetching pages by type ${type}:`, err);
      return [];
    }
  });

  console.log('✓ Template extensions registered');
}
