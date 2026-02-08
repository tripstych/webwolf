/**
 * Product Extension
 * Adds ecommerce product functionality to content types
 */

import { query } from '../../db/connection.js';

const productExtension = {
  name: 'product',
  label: 'Product',
  description: 'Adds ecommerce product functionality with pricing, inventory, and variants',
  version: '1.0.0',

  /**
   * Additional fields added to content items when this extension is enabled
   */
  fields: {
    sku: {
      type: 'string',
      label: 'SKU',
      required: true,
      help: 'Stock Keeping Unit - unique identifier for the product',
      validation: {
        pattern: '^[A-Za-z0-9-_]+$',
        message: 'SKU can only contain letters, numbers, dashes, and underscores'
      }
    },
    price: {
      type: 'number',
      label: 'Price',
      required: true,
      help: 'Selling price of the product',
      min: 0
    },
    compare_at_price: {
      type: 'number',
      label: 'Compare at Price',
      help: 'Original price for displaying discounts',
      min: 0
    },
    cost: {
      type: 'number',
      label: 'Cost',
      help: 'Cost of goods sold (internal use only)',
      min: 0
    },
    inventory_quantity: {
      type: 'integer',
      label: 'Inventory Quantity',
      default: 0,
      help: 'Current stock level'
    },
    inventory_tracking: {
      type: 'boolean',
      label: 'Track Inventory',
      default: true,
      help: 'Enable inventory tracking for this product'
    },
    allow_backorder: {
      type: 'boolean',
      label: 'Allow Backorder',
      default: false,
      help: 'Allow customers to purchase out-of-stock items'
    },
    weight: {
      type: 'number',
      label: 'Weight',
      help: 'Product weight for shipping calculations',
      min: 0
    },
    weight_unit: {
      type: 'string',
      label: 'Weight Unit',
      enum: ['kg', 'lb', 'oz', 'g'],
      default: 'lb'
    },
    requires_shipping: {
      type: 'boolean',
      label: 'Requires Shipping',
      default: true,
      help: 'Whether this product needs to be shipped'
    },
    taxable: {
      type: 'boolean',
      label: 'Taxable',
      default: true,
      help: 'Whether tax applies to this product'
    },
    status: {
      type: 'string',
      label: 'Product Status',
      enum: ['active', 'draft', 'archived'],
      default: 'draft'
    },
    variants: {
      type: 'array',
      label: 'Variants',
      help: 'Product variants (size, color, etc.)',
      itemType: {
        type: 'object',
        fields: {
          id: { type: 'integer' },
          title: { type: 'string', label: 'Title', required: true },
          sku: { type: 'string', label: 'SKU' },
          price: { type: 'number', label: 'Price', min: 0 },
          compare_at_price: { type: 'number' },
          inventory_quantity: { type: 'integer', default: 0 },
          option1_name: { type: 'string' },
          option1_value: { type: 'string' },
          option2_name: { type: 'string' },
          option2_value: { type: 'string' },
          option3_name: { type: 'string' },
          option3_value: { type: 'string' },
          image: { type: 'string' }
        }
      }
    }
  },

  /**
   * Validators for product fields
   */
  validators: [
    async (data, context) => {
      // Validate SKU uniqueness
      if (data.sku) {
        const results = await query(
          'SELECT id FROM products WHERE sku = ? AND (? IS NULL OR id != ?)',
          [data.sku, context.productId, context.productId]
        );
        if (results.length > 0) {
          throw new Error(`SKU "${data.sku}" already exists`);
        }
      }
      return data;
    },
    async (data, context) => {
      // Validate variant SKUs are unique
      if (data.variants && data.variants.length > 0) {
        const skus = data.variants
          .map(v => v.sku)
          .filter(sku => sku);

        // Check for duplicates within variants
        const unique = new Set(skus);
        if (unique.size !== skus.length) {
          throw new Error('Variant SKUs must be unique');
        }

        // Check against existing variants (when updating)
        if (context.productId) {
          const existingVariants = await query(
            'SELECT sku FROM product_variants WHERE product_id = ? AND sku IS NOT NULL AND sku != ""',
            [context.productId]
          );
          const existingSkus = existingVariants.map(v => v.sku);
          const newSkus = skus.filter(sku => !data.variants.find(v => v.id)); // new variants only

          for (const sku of newSkus) {
            if (existingSkus.includes(sku)) {
              throw new Error(`SKU "${sku}" already used by another variant`);
            }
          }
        }
      }
      return data;
    }
  ],

  /**
   * API endpoints provided by this extension
   */
  apiRoutes: {
    endpoints: [
      'GET /products',
      'GET /products/:id',
      'POST /products',
      'PUT /products/:id',
      'DELETE /products/:id',
      'POST /products/:id/variants',
      'PUT /products/:id/variants/:vid',
      'DELETE /products/:id/variants/:vid',
      'POST /products/:id/inventory'
    ]
  },

  /**
   * Lifecycle hooks
   */
  hooks: {
    /**
     * Before saving a product
     */
    before_save: async (data, context) => {
      // Validate price if it exists
      if (data.price !== undefined && data.price < 0) {
        throw new Error('Price cannot be negative');
      }
      if (data.compare_at_price !== undefined && data.compare_at_price < 0) {
        throw new Error('Compare at price cannot be negative');
      }
      return data;
    },

    /**
     * After creating a product
     */
    after_create: async (product, context) => {
      console.log(`Product created: ${product.id} (${product.sku})`);
      return product;
    },

    /**
     * Before deleting a product
     */
    before_delete: async (product, context) => {
      // Could add validation here, e.g., prevent deletion if product has orders
      return product;
    }
  },

  /**
   * Admin UI configuration
   */
  admin: {
    icon: 'ShoppingCart',
    color: 'blue',
    label: 'Product',
    pluralLabel: 'Products',
    menuOrder: 10,
    showInMenu: true
  }
};

export default productExtension;
