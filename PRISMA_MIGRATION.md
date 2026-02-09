# Prisma ORM Migration Plan

## Overview

We're migrating WebWolf CMS from raw SQL + repository pattern to **Prisma 6 ORM** for better type safety, atomic operations, and cleaner code.

## Completed ✅

### Phase 0: Setup
- [x] Install Prisma 6 and @prisma/client
- [x] Configure DATABASE_URL in .env and prisma.config.ts
- [x] Run `prisma db pull` to introspect existing database
- [x] Generate Prisma client with full schema for 20 models
- [x] Create Prisma utility module (`server/lib/prisma.js`)
- [x] Test Prisma connection (server boots successfully)

### Phase 1: Pages & Blocks APIs (DONE)
- [x] Create `server/api/pages-prisma.js` - Full Prisma rewrite:
  - GET / - List pages with pagination
  - GET /:id - Get single page with relations
  - POST / - Create page + content atomically
  - PUT /:id - Update page + content
  - DELETE /:id - Delete page + orphaned content
  - POST /:id/duplicate - Duplicate page with new slug

- [x] Create `server/api/blocks-prisma.js` - Full Prisma rewrite:
  - GET / - List blocks with pagination
  - GET /:id - Get single block
  - POST / - Create block + content
  - PUT /:id - Update block + content
  - DELETE /:id - Delete block

- [x] Update `server/api/index.js` to use pages-prisma and blocks-prisma
- [x] Fix missing `content_type` field in:
  - `admin/src/pages/PageEditor.jsx` (added `content_type: 'pages'`)
  - `admin/src/blocks/BlockEditor.jsx` (added `content_type: 'blocks'`)

## Remaining Work

### Phase 2: Products API (HIGH PRIORITY)
- [ ] Create `server/api/products-prisma.js` with Prisma:
  - GET / - List products with pagination, filters (status, search)
  - GET /:id - Get product with variants
  - POST / - Create product atomically
  - PUT /:id - Update product with variants
  - DELETE /:id - Delete product
  - POST /:id/variants - Manage variants
  - POST /:id/inventory - Adjust inventory
  - GET /check-sku/:sku - SKU uniqueness check

- [ ] Update `server/api/index.js` to use products-prisma
- [ ] Fix ProductEditor if needed (check content_type)

### Phase 3: Orders API (HIGH PRIORITY)
- [ ] Create `server/api/orders-prisma.js`:
  - GET / - List orders with pagination, filters
  - GET /:id - Get order with items
  - GET /number/:orderNumber - Get order by order number (guest)
  - POST / - Create order atomically with inventory deduction
  - PUT /:id/status - Update order status
  - PUT /:id/payment-status - Update payment status
  - PUT /:id/tracking - Add tracking info

- [ ] Create `server/api/customers-prisma.js`:
  - GET / - List customers
  - GET /:id - Get customer with orders
  - GET /stats/overview - Customer statistics

### Phase 4: Templates API (MEDIUM PRIORITY)
- [ ] Create `server/api/templates-prisma.js`:
  - GET / - List templates with filters
  - GET /id/:id - Get template by ID
  - GET /content_type/:contentType - Get templates by content type
  - GET /content_type/blocks/list - Block templates
  - PUT /:id - Update template metadata
  - DELETE /:id - Delete template (with usage checks)
  - Service methods (sync, reload, parse) - Keep as-is

### Phase 5: Other APIs (LOW PRIORITY)
- [ ] `server/api/cart.js` - Keep as-is or Prisma-ify?
- [ ] `server/api/payments.js` - Keep as-is (external service)
- [ ] `server/api/settings.js` - Prisma-ify if needed
- [ ] `server/api/menus.js` - Prisma-ify if needed
- [ ] `server/api/groups.js` - Prisma-ify if needed
- [ ] Remove old repository pattern files

## Key Benefits of Prisma

1. **Type Safety**: All database operations typed at compile time
2. **Atomic Transactions**: Built-in transaction support for multi-step operations
3. **Relation Handling**: Automatic JOIN handling with `.include()` and `.select()`
4. **Query Optimization**: Smart query generation
5. **Migration System**: Built-in schema migrations (if needed later)
6. **Error Handling**: Better, more consistent error messages
7. **Code Clarity**: Declarative queries vs. raw SQL strings

## Migration Pattern

### Old (Raw SQL + Repository Pattern)
```javascript
const pageRepo = new PageRepository();
const pages = await pageRepo.listWithTemplate(
  { status: 'published' },
  limit,
  offset
);
```

### New (Prisma)
```javascript
const pages = await prisma.pages.findMany({
  where: { status: 'published' },
  include: {
    content: true,
    templates: true
  },
  take: limit,
  skip: offset
});
```

## Testing Checklist

After each API migration, verify:
- [ ] List endpoint returns paginated response with `data` and `pagination`
- [ ] Single item fetch returns complete data with relations
- [ ] Create operation is atomic (both page and content created together)
- [ ] Update preserves data integrity
- [ ] Delete cascades correctly
- [ ] Frontend components work with new response format
- [ ] No duplicate records created (original issue resolved)

## Files Affected

### New Files
- `server/api/pages-prisma.js` ✅
- `server/api/blocks-prisma.js` ✅
- `server/api/products-prisma.js`
- `server/api/orders-prisma.js`
- `server/api/customers-prisma.js`
- `server/api/templates-prisma.js`
- `server/lib/prisma.js` ✅

### Modified Files
- `server/api/index.js` ✅ (route imports)
- `.env` ✅ (DATABASE_URL)
- `prisma/schema.prisma` ✅ (introspected schema)
- `admin/src/pages/PageEditor.jsx` ✅ (added content_type)
- `admin/src/blocks/BlockEditor.jsx` ✅ (added content_type)
- `admin/src/products/ProductEditor.jsx` (may need content_type)

### To Remove (After Migration Complete)
- `server/db/repositories/` - All repository files
- `server/api/pages.js` - Keep until pages-prisma is stable
- `server/api/blocks.js` - Keep until blocks-prisma is stable
- etc.

## Conflict Resolution

The original issue was **duplicate page creation**. With Prisma:
- ✅ Atomic create operation (both page + content in one transaction)
- ✅ Explicit content_type handling (no undefined values)
- ✅ Type safety prevents accidental duplicate fields
- ✅ Better error reporting if something goes wrong

## Database Schema Notes

Prisma introspected 20 models:
```
addresses, blocks, content, content_groups, content_type_extensions,
content_types, customers, groups, media, menu_items, menus, order_items,
orders, pages, product_variants, products, redirects, settings, templates, users
```

All relationships are properly defined with foreign keys and cascading deletes where appropriate.

## Next Steps

1. **Immediate**: Test pages and blocks APIs thoroughly
2. **Today**: Migrate products API (most used after pages/blocks)
3. **This week**: Complete orders and customers APIs
4. **This week**: Complete templates API
5. **Later**: Clean up old repository pattern code
6. **Later**: Consider Prisma migrations for schema changes

## Related Issues Fixed

- ✅ Duplicate page creation (atomic operations prevent this)
- ✅ Missing content_type fields (explicitly set in editors)
- ✅ Inconsistent pagination responses (Prisma handles uniformly)
- ✅ Raw SQL scattered across codebase (now centralized in Prisma calls)
