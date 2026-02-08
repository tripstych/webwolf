# Embedding Products in Pages

Products can now be displayed anywhere in your page templates using global Nunjucks functions. This allows you to create flexible layouts like featured products, product recommendations, showcase pages, etc.

## Available Functions

### 1. `getProduct(id)`
Fetch a single product by ID.

```nunjucks
{% set product = getProduct(5) %}
<h2>{{ product.title }}</h2>
<p>${{ product.price }}</p>
```

**Returns:** Product object or null

### 2. `getProductBySlug(slug)`
Fetch a product by its slug (URL path).

```nunjucks
{% set product = getProductBySlug('/products/cool-shirt') %}
```

**Returns:** Product object or null

### 3. `getProductsByIds(ids)`
Fetch multiple products by their IDs.

```nunjucks
{% set products = getProductsByIds([1, 2, 5, 10]) %}
{% for product in products %}
  <div>{{ product.title }} - ${{ product.price }}</div>
{% endfor %}
```

**Returns:** Array of product objects

### 4. `getProductsByCategory(category, limit)`
Fetch active products (limit defaults to 10).

```nunjucks
{% set featuredProducts = getProductsByCategory('featured', 3) %}
```

**Returns:** Array of product objects

## Product Object Properties

```javascript
{
  id: 1,
  sku: 'PROD-001',
  title: 'Product Name',
  slug: '/products/product-slug',
  price: 99.99,
  compare_at_price: 129.99,      // Optional: original price if on sale
  cost: 45.00,                    // Cost of goods (not public)
  inventory_quantity: 50,
  inventory_tracking: true,
  allow_backorder: false,
  weight: 2.5,
  weight_unit: 'lb',
  requires_shipping: true,
  taxable: true,
  status: 'active'                // 'active', 'draft', 'archived'
}
```

## Usage Examples

### Example 1: Featured Product on Homepage

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<div class="hero">
  <h1>Welcome to Our Store</h1>

  <div class="featured-product">
    {% set featured = getProduct(1) %}
    {% if featured %}
      <h2>{{ featured.title }}</h2>
      <p class="price">${{ featured.price }}</p>
      <a href="/{{ featured.slug }}" class="btn">Shop Now</a>
    {% endif %}
  </div>
</div>
{% endblock %}
```

### Example 2: Product Showcase Grid

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<h1>Featured Collections</h1>

<div class="product-grid">
  {% set products = getProductsByIds([1, 2, 3, 4, 5, 6]) %}

  {% for product in products %}
    {% include "components/product-card.njk" with { product: product } %}
  {% endfor %}
</div>

<style>
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
  }
</style>
{% endblock %}
```

### Example 3: Related Products Section

```nunjucks
{# In a product page or any template #}

<div class="related-products">
  <h3>You Might Also Like</h3>

  <div class="products-list">
    {% set relatedIds = [2, 3, 4] %}
    {% set products = getProductsByIds(relatedIds) %}

    {% for product in products %}
      <div class="product-item">
        <h4>{{ product.title }}</h4>
        <p>${{ product.price }}</p>
        {% if product.slug %}
          <a href="/{{ product.slug }}">View</a>
        {% endif %}
      </div>
    {% endfor %}
  </div>
</div>
```

### Example 4: Using the Reusable Card Component

The `templates/components/product-card.njk` component can be included with either a product object or a product ID:

```nunjucks
{# With product object #}
{% set product = getProduct(5) %}
{% include "components/product-card.njk" with { product: product } %}

{# With product ID (component fetches it) #}
{% include "components/product-card.njk" with { productId: 5 } %}

{# In a loop #}
{% set products = getProductsByIds([1, 2, 3]) %}
{% for product in products %}
  {% include "components/product-card.njk" with { product: product } %}
{% endfor %}
```

### Example 5: Custom Pricing Display

```nunjucks
{% set product = getProduct(1) %}

{% if product %}
  <div class="price-display">
    <span class="current-price">${{ product.price }}</span>

    {% if product.compare_at_price > product.price %}
      <span class="original-price">${{ product.compare_at_price }}</span>
      {% set discount = (100 - (product.price / product.compare_at_price * 100)) | round %}
      <span class="sale-badge">{{ discount }}% OFF</span>
    {% endif %}
  </div>
{% endif %}
```

### Example 6: Conditional Display Based on Stock

```nunjucks
{% set product = getProduct(1) %}

{% if product.inventory_quantity > 10 %}
  <div class="in-stock">In Stock</div>
  <button>Add to Cart</button>
{% elif product.inventory_quantity > 0 %}
  <div class="low-stock">Only {{ product.inventory_quantity }} left!</div>
  <button>Add to Cart</button>
{% elif product.allow_backorder %}
  <div class="backorder">Available for Backorder</div>
  <button>Pre-Order</button>
{% else %}
  <div class="out-of-stock">Out of Stock</div>
  <button disabled>Unavailable</button>
{% endif %}
```

## Performance Considerations

Each function call makes a database query. For optimal performance:

- **Avoid calling the same product multiple times** - Store the result in a variable and reuse it
  ```nunjucks
  {# Good #}
  {% set product = getProduct(1) %}
  <h2>{{ product.title }}</h2>
  <p>{{ product.sku }}</p>

  {# Avoid #}
  <h2>{{ getProduct(1).title }}</h2>
  <p>{{ getProduct(1).sku }}</p>  {# Second call! #}
  ```

- **Use `getProductsByIds()` for multiple products** - More efficient than calling `getProduct()` multiple times
  ```nunjucks
  {# Better #}
  {% set products = getProductsByIds([1, 2, 3]) %}

  {# Less efficient #}
  {% set p1 = getProduct(1) %}
  {% set p2 = getProduct(2) %}
  {% set p3 = getProduct(3) %}
  ```

- **Cache results when displaying the same products multiple times** on a page

## Creating Custom Product Displays

You can easily create custom templates for different contexts:

```nunjucks
{# templates/components/product-mini.njk - for sidebars #}
{% if productId %}
  {% set product = getProduct(productId) %}
{% endif %}

{% if product %}
  <div class="product-mini">
    <div class="title">{{ product.title }}</div>
    <div class="price">${{ product.price }}</div>
    {% if product.slug %}
      <a href="/{{ product.slug }}">View →</a>
    {% endif %}
  </div>
{% endif %}
```

## Error Handling

Functions return `null` or empty arrays if products aren't found, so use conditional checks:

```nunjucks
{% set product = getProduct(999) %}

{% if product %}
  {# Product exists, display it #}
  <div>{{ product.title }}</div>
{% else %}
  {# Product not found, show fallback #}
  <p>Product not available</p>
{% endif %}
```
