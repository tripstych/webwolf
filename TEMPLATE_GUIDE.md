# WebWolf Template Builder's Guide

Complete guide to building templates for the WebWolf CMS public site.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Template Structure](#template-structure)
3. [Available Variables](#available-variables)
4. [Template Extensions](#template-extensions)
5. [Reusable Components](#reusable-components)
6. [Content Types](#content-types)
7. [Layouts](#layouts)
8. [Examples](#examples)
9. [Best Practices](#best-practices)

---

## Architecture Overview

WebWolf uses a **modular, content-type driven architecture**:

### How It Works

1. **Content Types** - Define the structure of your content (pages, products, blog posts, etc.)
2. **Templates** - Render content using Nunjucks template files
3. **Template Folders** - Each content type has its own folder with templates
4. **Extension Functions** - Access data from templates using JavaScript functions
5. **Components** - Reusable partial templates for common layouts

### File Organization

```
templates/
├── layouts/
│   └── base.njk              # Main layout all pages extend
├── pages/
│   ├── extensions.js         # Data lookup functions
│   ├── index.njk             # Pages listing template
│   └── *.njk                 # Page content templates
├── products/
│   ├── product-single.njk    # Individual product page
│   └── product-list.njk      # Products listing
├── components/
│   ├── header.njk
│   ├── footer.njk
│   ├── product-card.njk
│   └── *.njk                 # Reusable partials
└── shop/
    ├── cart.njk
    ├── checkout.njk
    └── order-confirmation.njk
```

---

## Template Structure

### Extending the Base Layout

All content pages should extend `layouts/base.njk`:

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
  {# Your content goes here #}
{% endblock %}
```

### What's Available in Base Layout

The base layout provides:
- Header with navigation
- Footer
- CSS framework (Tailwind)
- Site variables and menus
- Block rendering

---

## Available Variables

Every template receives a **context object** with these variables:

### `page` - Current Page/Content

```javascript
{
  id: 1,
  title: "Page Title",
  slug: "/pages/my-page",
  meta_title: "SEO Title",
  meta_description: "SEO Description",
  status: "published",
  template_filename: "pages/default.njk"
}
```

Usage:
```nunjucks
<h1>{{ page.title }}</h1>
<meta name="description" content="{{ page.meta_description }}">
```

### `content` - Page Content Data

The parsed JSON data from the page's content fields:

```javascript
{
  sections: [...],
  features: [...],
  gallery: [...]
}
```

Usage:
```nunjucks
{% for section in content.sections %}
  <div>{{ section.title }}</div>
{% endfor %}
```

### `seo` - SEO Metadata

```javascript
{
  title: "Page Title",
  description: "Meta description",
  canonical: "https://example.com/page",
  robots: "index, follow",
  og: {
    title: "Open Graph Title",
    description: "Open Graph Description",
    image: "/path/to/image.jpg",
    url: "https://example.com/page",
    type: "website"
  },
  schema: { /* Structured data */ }
}
```

Usage:
```nunjucks
<title>{{ seo.title }}</title>
<meta name="description" content="{{ seo.description }}">
<meta property="og:image" content="{{ seo.og.image }}">
{% if seo.schema %}
  <script type="application/ld+json">{{ seo.schema | safe }}</script>
{% endif %}
```

### `site` - Site Settings

```javascript
{
  site_name: "My Store",
  site_url: "https://example.com",
  stripe_public_key: "pk_...",
  default_meta_description: "...",
  // ... all settings from database
}
```

Usage:
```nunjucks
<a href="{{ site.site_url }}">{{ site.site_name }}</a>
```

### `menus` - Navigation Menus

```javascript
[
  {
    id: 1,
    slug: "main",
    name: "Main Menu",
    items: [
      {
        id: 1,
        title: "Home",
        url: "/",
        children: [...]
      }
    ]
  }
]
```

Usage:
```nunjucks
{% set mainMenu = menus | selectattr('slug', 'equalto', 'main') | first %}
{% for item in mainMenu.items %}
  <a href="{{ item.url }}">{{ item.title }}</a>
{% endfor %}
```

### `product` - Product Data (on product pages)

Same as products fetched with `getProduct()`:

```javascript
{
  id: 1,
  title: "Product Name",
  slug: "/products/product-slug",
  sku: "PROD-001",
  price: 99.99,
  inventory_quantity: 50,
  // ... other product fields
}
```

---

## Template Extensions

Global functions available in any template for fetching data.

### Product Functions

#### `getProduct(id)`
Fetch a single product by ID.

```nunjucks
{% set product = getProduct(5) %}
<h2>{{ product.title }}</h2>
<p>${{ product.price }}</p>
```

#### `getProductBySlug(slug)`
Fetch a product by its slug.

```nunjucks
{% set product = getProductBySlug('/products/cool-shirt') %}
```

#### `getProductsByIds(ids)`
Fetch multiple products by IDs.

```nunjucks
{% set products = getProductsByIds([1, 2, 3, 5]) %}
{% for product in products %}
  {% include "components/product-card.njk" with { product: product } %}
{% endfor %}
```

#### `getProductsByCategory(category, limit)`
Fetch active products (limit defaults to 10).

```nunjucks
{% set featured = getProductsByCategory('featured', 3) %}
```

### Page Functions

#### `getPage(id)`
Fetch a single page by ID.

```nunjucks
{% set aboutPage = getPage(2) %}
<a href="/{{ aboutPage.slug }}">{{ aboutPage.title }}</a>
```

#### `getPageBySlug(slug)`
Fetch a page by slug.

```nunjucks
{% set aboutPage = getPageBySlug('/pages/about') %}
```

#### `getPagesByIds(ids)`
Fetch multiple pages by IDs.

```nunjucks
{% set pages = getPagesByIds([1, 2, 3]) %}
```

#### `getPagesByType(type, limit)`
Fetch pages by content type (useful for blog posts, guides, etc.).

```nunjucks
{% set blogPosts = getPagesByType('blog', 10) %}
{% for post in blogPosts %}
  <article>
    <h3>{{ post.title }}</h3>
    <a href="/{{ post.slug }}">Read More</a>
  </article>
{% endfor %}
```

---

## Reusable Components

### Creating a Component

Components are partial templates that can be included in other templates:

```nunjucks
{# templates/components/card.njk #}
<div class="card">
  <h3>{{ title }}</h3>
  <p>{{ description }}</p>
</div>
```

### Using a Component

```nunjucks
{% include "components/card.njk" with {
  title: "My Title",
  description: "My description"
} %}
```

### Example: Product Card Component

```nunjucks
{# templates/components/product-card.njk #}
{% if productId %}
  {% set product = getProduct(productId) %}
{% endif %}

{% if product %}
  <div class="product-card">
    <h3>{{ product.title }}</h3>
    <p class="price">${{ product.price }}</p>

    {% if product.inventory_quantity > 0 %}
      <span class="in-stock">In Stock</span>
    {% else %}
      <span class="out-of-stock">Out of Stock</span>
    {% endif %}

    {% if product.slug %}
      <a href="/{{ product.slug }}" class="btn">View Details</a>
    {% endif %}
  </div>
{% endif %}
```

Usage:
```nunjucks
{# Pass product object #}
{% set product = getProduct(5) %}
{% include "components/product-card.njk" with { product: product } %}

{# Or let component fetch it #}
{% include "components/product-card.njk" with { productId: 5 } %}
```

---

## Content Types

### Understanding Content Types

Each content type has:
- **Database representation** - Stored in the `content` table
- **Template folder** - Templates for rendering
- **Admin interface** - For managing content

### Standard Content Types

#### Pages
- **Location**: `templates/pages/`
- **Templates**: `index.njk` (list), `default.njk` (single page)
- **Use for**: Static content, about pages, contact pages

#### Products
- **Location**: `templates/products/`
- **Templates**: `product-list.njk`, `product-single.njk`
- **Use for**: Store items with pricing and inventory
- **Variables**: `product` object with price, sku, inventory_quantity

#### Blocks
- **Location**: `templates/blocks/`
- **Templates**: Various based on block type
- **Use for**: Reusable content blocks (hero sections, callouts, etc.)

#### Custom Content Types
You can create custom content types through the admin panel. They follow the same pattern as standard types.

---

## Layouts

### Base Layout

The main layout file should:

```nunjucks
{# templates/layouts/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  {# SEO #}
  <title>{{ seo.title }}</title>
  <meta name="description" content="{{ seo.description }}">
  <meta name="robots" content="{{ seo.robots }}">
  <link rel="canonical" href="{{ seo.canonical }}">

  {# Open Graph #}
  <meta property="og:title" content="{{ seo.og.title }}">
  <meta property="og:description" content="{{ seo.og.description }}">
  <meta property="og:image" content="{{ seo.og.image }}">
  <meta property="og:url" content="{{ seo.og.url }}">

  {# Schema #}
  {% if seo.schema %}
    <script type="application/ld+json">{{ seo.schema | safe }}</script>
  {% endif %}

  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  {% include "components/header.njk" %}

  <main>
    {% block content %}{% endblock %}
  </main>

  {% include "components/footer.njk" %}

  <script src="/js/main.js"></script>
</body>
</html>
```

### Child Templates

Child templates extend the base:

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
  <div class="page-content">
    <h1>{{ page.title }}</h1>
    <!-- Your content -->
  </div>
{% endblock %}
```

---

## Examples

### Example 1: Simple Page Template

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article class="page">
  <h1>{{ page.title }}</h1>

  {% if content.featured_image %}
    <img src="{{ content.featured_image }}" alt="{{ page.title }}">
  {% endif %}

  <div class="page-body">
    {{ content.body | safe }}
  </div>
</article>
{% endblock %}
```

### Example 2: Product Grid

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<section class="products">
  <h1>Our Products</h1>

  <div class="grid">
    {% set products = getProductsByCategory('featured', 12) %}

    {% for product in products %}
      <div class="product-item">
        <h3>{{ product.title }}</h3>
        <p class="price">${{ product.price }}</p>

        {% if product.inventory_quantity > 0 %}
          <a href="/{{ product.slug }}" class="btn">Shop Now</a>
        {% else %}
          <button disabled>Out of Stock</button>
        {% endif %}
      </div>
    {% endfor %}
  </div>
</section>
{% endblock %}
```

### Example 3: Blog with Related Posts

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article class="blog-post">
  <h1>{{ page.title }}</h1>

  <div class="post-meta">
    <time datetime="{{ page.created_at }}">
      {{ page.created_at | date('MMM D, YYYY') }}
    </time>
  </div>

  <div class="post-body">
    {{ content.body | safe }}
  </div>

  {# Related posts #}
  <aside class="related-posts">
    <h3>Related Articles</h3>

    {% set related = getPagesByType('blog', 3) %}

    {% for post in related %}
      {% if post.slug !== page.slug %}
        <div class="related-item">
          <h4><a href="/{{ post.slug }}">{{ post.title }}</a></h4>
        </div>
      {% endif %}
    {% endfor %}
  </aside>
</article>
{% endblock %}
```

### Example 4: Homepage with Mixed Content

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<section class="hero">
  <h1>Welcome</h1>
  <p>{{ site.site_name }}</p>
</section>

{# Featured Products #}
<section class="featured-products">
  <h2>Featured Products</h2>

  <div class="grid">
    {% set products = getProductsByIds([1, 2, 3, 4]) %}
    {% for product in products %}
      {% include "components/product-card.njk" with { product: product } %}
    {% endfor %}
  </div>
</section>

{# Latest Blog Posts #}
<section class="latest-posts">
  <h2>Latest Articles</h2>

  {% set posts = getPagesByType('blog', 5) %}

  {% for post in posts %}
    <article class="post-summary">
      <h3><a href="/{{ post.slug }}">{{ post.title }}</a></h3>
    </article>
  {% endfor %}
</section>
{% endblock %}
```

---

## Best Practices

### 1. Store Results in Variables

```nunjucks
{# Good - reuse the variable #}
{% set product = getProduct(5) %}
<h2>{{ product.title }}</h2>
<p>{{ product.sku }}</p>

{# Avoid - multiple calls #}
<h2>{{ getProduct(5).title }}</h2>
<p>{{ getProduct(5).sku }}</p>
```

### 2. Use Bulk Functions for Multiple Items

```nunjucks
{# Good - single query #}
{% set products = getProductsByIds([1, 2, 3]) %}

{# Less efficient - multiple queries #}
{% set p1 = getProduct(1) %}
{% set p2 = getProduct(2) %}
{% set p3 = getProduct(3) %}
```

### 3. Handle Missing Data Gracefully

```nunjucks
{% set product = getProduct(999) %}

{% if product %}
  <h2>{{ product.title }}</h2>
{% else %}
  <p>Product not found</p>
{% endif %}
```

### 4. Use Components for Repetitive Content

Instead of repeating HTML, create a component:

```nunjucks
{# ✓ Good - DRY (Don't Repeat Yourself) #}
{% for product in products %}
  {% include "components/product-card.njk" with { product: product } %}
{% endfor %}

{# ✗ Avoid - Repeating HTML #}
{% for product in products %}
  <div class="card">{{ product.title }}</div>
{% endfor %}
```

### 5. SEO Considerations

Always include proper SEO meta tags:

```nunjucks
<title>{{ seo.title }}</title>
<meta name="description" content="{{ seo.description }}">
<meta name="robots" content="{{ seo.robots }}">
<link rel="canonical" href="{{ seo.canonical }}">
```

### 6. Use Safe Filter for HTML Content

When rendering user content (like rich text editors):

```nunjucks
{# Safe - doesn't escape HTML #}
<div class="content">{{ content.body | safe }}</div>

{# Unsafe - escapes HTML tags #}
<div class="content">{{ content.body }}</div>
```

### 7. Performance: Limit Database Queries

```nunjucks
{# Good - single query for 3 items #}
{% set items = getPagesByType('blog', 3) %}

{# Less efficient - makes 3 queries #}
{% set item1 = getPage(1) %}
{% set item2 = getPage(2) %}
{% set item3 = getPage(3) %}
```

### 8. Mobile Responsive Design

Use Tailwind's responsive utilities:

```nunjucks
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {# Automatically responsive #}
</div>
```

### 9. Accessibility

Always include proper attributes:

```nunjucks
<img src="{{ product.image }}" alt="{{ product.title }}">
<a href="{{ url }}" title="{{ description }}">{{ link_text }}</a>
<button aria-label="Close menu">×</button>
```

### 10. Conditional Content

Show/hide content based on conditions:

```nunjucks
{% if product.inventory_quantity > 0 %}
  <a href="#" class="btn-add-to-cart">Add to Cart</a>
{% elif product.allow_backorder %}
  <a href="#" class="btn-backorder">Backorder</a>
{% else %}
  <span class="out-of-stock">Out of Stock</span>
{% endif %}
```

---

## Nunjucks Filters

Common Nunjucks filters available in templates:

```nunjucks
{# String operations #}
{{ text | upper }}           {# Uppercase #}
{{ text | lower }}           {# Lowercase #}
{{ text | truncate(50) }}    {# Truncate text #}

{# Date formatting #}
{{ date | date('YYYY-MM-DD') }}
{{ date | date('MMM D, YYYY') }}

{# Custom filters #}
{{ html | stripHtml }}       {# Remove HTML tags #}
{{ price | round(2) }}       {# Round to 2 decimals #}

{# Safe rendering #}
{{ html | safe }}            {# Don't escape HTML #}
```

---

## Resources

- [Nunjucks Documentation](https://mozilla.github.io/nunjucks/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- Template Extensions: `PRODUCT_EMBEDS.md`
- Webhook Setup: `WEBHOOK_SETUP.md`

---

**Happy templating!** 🎉
