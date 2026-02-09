# Data Access Layer - Repository Pattern

Clean, centralized database queries instead of raw SQL scattered everywhere.

## Structure

```
server/db/repositories/
├── BaseRepository.js      # Common CRUD operations
├── ProductRepository.js   # Product-specific queries
├── OrderRepository.js     # Order-specific queries
├── CustomerRepository.js  # Customer-specific queries
├── PageRepository.js      # Page-specific queries
└── index.js              # Exports all repositories
```

## Basic Usage

### Import

```javascript
import { ProductRepository, OrderRepository } from '../db/repositories/index.js';

const productRepo = new ProductRepository();
const orderRepo = new OrderRepository();
```

### Find Operations

```javascript
// Find by ID
const product = await productRepo.findById(5);

// Find by custom field
const product = await productRepo.findBySku('SHIRT-001');

// Find all
const products = await productRepo.findAll({ status: 'active' }, limit, offset);

// Count
const count = await productRepo.count({ status: 'active' });
```

### CRUD Operations

```javascript
// Create
const productId = await productRepo.create({
  sku: 'NEW-001',
  price: 29.99,
  status: 'draft'
});

// Update
const product = await productRepo.update(productId, {
  price: 39.99,
  status: 'active'
});

// Delete
await productRepo.delete(productId);
```

### Special Methods

Each repository has domain-specific methods:

```javascript
// Products
await productRepo.listWithContent({ status: 'active' }, 50, 0);
await productRepo.getByIds([1, 2, 3]);
await productRepo.adjustInventory(productId, -1);
await productRepo.skuExists('SHIRT-001');

// Orders
await orderRepo.listWithFilters({ status: 'pending' }, 50, 0);
await orderRepo.getWithItems(orderId);
await orderRepo.updateStatus(orderId, 'shipped');
await orderRepo.addTracking(orderId, 'TRACK123', 'Express');

// Customers
await customerRepo.listWithSearch('john', 50, 0);
await customerRepo.getWithAddresses(customerId);
await customerRepo.getStats(customerId);
await customerRepo.getTopBySpend(10);

// Pages
await pageRepo.listWithContent({ status: 'published' }, 50, 0);
await pageRepo.getPublishedByType('blog', 50);
await pageRepo.search('marketing', 20);
```

### Raw Queries

For complex queries, use `rawQuery()`:

```javascript
const results = await productRepo.rawQuery(
  `SELECT p.*, c.title FROM products p
   LEFT JOIN content c ON p.content_id = c.id
   WHERE p.price BETWEEN ? AND ?`,
  [10, 100]
);
```

## Benefits

1. **No SQL strings scattered everywhere** - Centralized in repositories
2. **Consistent error handling** - All queries use the same connection
3. **Easier refactoring** - Change database implementation once, everywhere works
4. **Reusable queries** - Methods can be used across multiple API endpoints
5. **Testable** - Can mock repositories for unit tests
6. **IDE autocomplete** - Methods show up in your editor

## Migration Path

You can gradually migrate the codebase:

1. Use repositories for new features
2. Refactor old endpoints one at a time
3. No rush - old raw SQL queries can coexist with repositories

Example: Converting an endpoint

**Before (raw SQL):**
```javascript
router.get('/products', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const products = await query(
    `SELECT p.* FROM products p LIMIT ${limit} OFFSET ${offset}`
  );
  res.json(products);
});
```

**After (repository):**
```javascript
import { ProductRepository } from '../db/repositories/index.js';

router.get('/products', async (req, res) => {
  const productRepo = new ProductRepository();
  const { limit = 50, offset = 0 } = req.query;
  const products = await productRepo.findAll({}, limit, offset);
  res.json(products);
});
```
