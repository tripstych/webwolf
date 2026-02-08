# Flexible Content Types System - Implementation Guide

## Overview

WebWolf CMS has been transformed from a rigid Pages/Blocks structure into a flexible, folder-based content types system. Each subfolder in `templates/` (e.g., `blog/`, `products/`) becomes its own content type with automatic navigation generation, dynamic routing, and database-backed filtering.

**Key Principle**: "New folder = instant content type" with zero code changes required.

---

## What's Changed

### Database Layer
- **New Table**: `content_types` - Stores metadata about each content type (name, label, icon, SEO settings, etc.)
- **Updated Tables**: `pages`, `blocks`, `templates` now have `content_type` column for filtering and organization
- **Auto-Discovery**: New content types are automatically registered when templates are synced

### Backend API
- **New Endpoint**: `/api/content-types` - List, retrieve, and manage content types
- **Template Filtering**: `/api/templates?content_type=blog` - Get templates for a specific content type
- **Content Type Detection**: Automatically extracts content type from template file path

### Frontend
- **New Context**: `ContentTypesContext` - Global state for content types
- **Dynamic Navigation**: Sidebar menu automatically generates items for each content type
- **Generic Components**: `ContentList` and `ContentEditor` - Reusable components for any content type
- **Dynamic Routing**: Routes automatically created for each content type

---

## Getting Started

### Step 1: Run Database Migration

The migration script will set up the `content_types` table and update existing tables:

```bash
node server/db/migrateContentTypes.js
```

**What it does**:
- Adds `content_type` column to `pages`, `blocks`, and `templates` tables
- Creates `content_types` table
- Seeds default "pages" and "blocks" content types
- Syncs all templates and auto-discovers new content types

### Step 2: Sync Templates from Filesystem

In the admin panel, go to **Templates** and click **Sync from Filesystem** (or call `/api/templates/sync`).

This will:
- Scan all `.njk` files in `templates/` directory
- Extract content type from folder name
- Register new content types automatically

### Step 3: Create New Content Type (Example: Blog)

```bash
mkdir templates/blog
```

Create `templates/blog/post.njk`:

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article>
  <h1 data-cms-region="post_title"
      data-cms-type="text"
      data-cms-label="Post Title">
    {{ content.post_title }}
  </h1>

  <div data-cms-region="post_content"
       data-cms-type="richtext"
       data-cms-label="Content">
    {{ content.post_content | safe }}
  </div>

  <div data-cms-region="author"
       data-cms-type="text"
       data-cms-label="Author">
    {{ content.author }}
  </div>
</article>
{% endblock %}
```

Run sync in admin panel → **"Blog"** automatically appears in navigation!

---

## Content Types Table Schema

```sql
CREATE TABLE content_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,           -- Identifier (e.g., "blog", "products")
  label VARCHAR(100) NOT NULL,                -- Singular (e.g., "Blog Post")
  plural_label VARCHAR(100) NOT NULL,         -- Plural (e.g., "Blog Posts")
  icon VARCHAR(50) DEFAULT 'FileText',        -- Icon name (BookOpen, Package, etc.)
  color VARCHAR(20) DEFAULT 'gray',           -- Theme color (for future UI enhancements)
  menu_order INT DEFAULT 999,                 -- Display order in navigation
  show_in_menu BOOLEAN DEFAULT TRUE,          -- Hide from navigation if FALSE
  has_status BOOLEAN DEFAULT TRUE,            -- Show status dropdown (draft/published/archived)
  has_seo BOOLEAN DEFAULT TRUE,               -- Show SEO meta fields
  is_system BOOLEAN DEFAULT FALSE,            -- Prevent deletion of core types (pages, blocks)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### List Content Types
```
GET /api/content-types
Response: [ { id, name, label, plural_label, icon, has_status, has_seo, ... } ]
```

### Get Single Content Type
```
GET /api/content-types/:name
Response: { id, name, label, plural_label, ... }
```

### Update Content Type Settings (Admin)
```
PUT /api/content-types/:name
Body: { label, plural_label, icon, menu_order, show_in_menu, has_status, has_seo }
```

### List Templates by Content Type
```
GET /api/templates?content_type=blog
Response: [ { id, name, filename, regions, content_type, ... } ]
```

---

## Frontend Components

### ContentList Component
Located: `admin/src/pages/ContentList.jsx`

**Props**: None (uses route params)

**Usage**:
- `/blog` → Shows list of all blog posts
- `/products` → Shows list of all products
- Supports filtering by status and search
- Auto-generated "New" button for creating content

**Features**:
- Dynamic title/labels from content type metadata
- Conditional status badge (if `has_status=true`)
- Responsive table with edit/delete actions
- Search and status filtering

### ContentEditor Component
Located: `admin/src/pages/ContentEditor.jsx`

**Props**: None (uses route params)

**Usage**:
- `/:contentType/new` → Create new item
- `/:contentType/:id` → Edit existing item

**Features**:
- Dynamically loads templates for content type
- Template selector with region preview
- Auto-generated slug from title
- Conditional SEO section (if `has_seo=true`)
- Conditional status dropdown (if `has_status=true`)
- Back button and breadcrumb navigation

### ContentTypesContext
Located: `admin/src/context/ContentTypesContext.jsx`

**Usage**:
```javascript
import { useContentTypes } from './context/ContentTypesContext';

function MyComponent() {
  const { contentTypes, loading, refreshContentTypes } = useContentTypes();
  // contentTypes: Array of all visible content types
  // loading: Boolean indicating initial load state
  // refreshContentTypes: Function to reload from API
}
```

---

## Template Folder Structure

```
templates/
├── layouts/
│   └── base.njk
├── pages/                      # "Pages" content type
│   ├── homepage.njk
│   ├── standard.njk
│   └── blog-post.njk
├── blocks/                     # "Blocks" content type
│   ├── cta.njk
│   ├── testimonial.njk
│   └── feature.njk
├── blog/                       # Auto-creates "Blog" content type
│   ├── post.njk
│   └── archive.njk
├── products/                   # Auto-creates "Products" content type
│   ├── single.njk
│   └── showcase.njk
└── team/                       # Auto-creates "Team" content type
    └── member.njk
```

**Rule**: First folder in path = content type name

---

## Default Content Types

### Pages
- **Label**: Page
- **Plural**: Pages
- **Icon**: FileText
- **Has Status**: ✅ Yes (draft/published/archived)
- **Has SEO**: ✅ Yes (meta title, description, OG tags)
- **System Type**: ✅ Yes (cannot be deleted)

### Blocks
- **Label**: Block
- **Plural**: Blocks
- **Icon**: Boxes
- **Has Status**: ❌ No (simple reusable components)
- **Has SEO**: ❌ No
- **System Type**: ✅ Yes (cannot be deleted)

---

## Auto-Generated Content Types

When you create a new folder in `templates/`, the system automatically:

1. **Discovers** the content type from folder name
2. **Creates** a row in `content_types` table with sensible defaults:
   - `label`: Capitalized folder name (e.g., "blog" → "Blog")
   - `plural_label`: Label + "s" (e.g., "Blog" → "Blogs")
   - `icon`: Mapped from content type (blog → BookOpen, products → Package)
   - `has_status`: `true` (except for "blocks")
   - `has_seo`: `false` (except for "pages")

3. **Generates** navigation menu items with appropriate icons
4. **Enables** dynamic routes and CRUD operations

---

## Customizing Content Types

### Hide from Navigation
```sql
UPDATE content_types SET show_in_menu = FALSE WHERE name = 'blog';
```

### Change Display Order
```sql
UPDATE content_types SET menu_order = 5 WHERE name = 'blog';
```

### Change Label/Icon
```sql
UPDATE content_types
SET label = 'Blog Article',
    plural_label = 'Blog Articles',
    icon = 'Newspaper'
WHERE name = 'blog';
```

### Enable/Disable Features
```sql
-- Enable SEO for blog content type
UPDATE content_types SET has_seo = TRUE WHERE name = 'blog';

-- Disable status for products
UPDATE content_types SET has_status = FALSE WHERE name = 'products';
```

---

## File Changes Summary

### New Files Created (5)
1. `server/db/migrateContentTypes.js` - Migration script
2. `server/api/contentTypes.js` - Content types API routes
3. `admin/src/context/ContentTypesContext.jsx` - Global content types state
4. `admin/src/pages/ContentList.jsx` - Generic listing component
5. `admin/src/pages/ContentEditor.jsx` - Generic editor component

### Modified Files (6)
1. `server/db/migrate.js` - Added content_types table schema
2. `server/db/seed.js` - Seed default content types
3. `server/services/templateParser.js` - Added content type extraction
4. `server/api/index.js` - Registered content types routes
5. `server/api/templates.js` - Added content_type filtering
6. `admin/src/main.jsx` - Added ContentTypesProvider
7. `admin/src/components/Layout.jsx` - Dynamic navigation menu
8. `admin/src/App.jsx` - Dynamic route generation

---

## Backwards Compatibility

✅ **Full backwards compatibility maintained**:
- Existing `/pages` routes still work
- Existing `/blocks` routes still work
- Old pages and blocks data unchanged
- System automatically migrates content_type values
- Can rollback by hiding new content types: `UPDATE content_types SET show_in_menu = FALSE`

---

## Examples

### Create a Blog Content Type

1. Create folder:
```bash
mkdir templates/blog
```

2. Create template `templates/blog/post.njk`:
```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article>
  <h1 data-cms-region="title" data-cms-type="text" data-cms-label="Title">
    {{ content.title }}
  </h1>
  <div data-cms-region="content" data-cms-type="richtext" data-cms-label="Content">
    {{ content.content | safe }}
  </div>
</article>
{% endblock %}
```

3. Sync templates in admin → "Blog" appears in menu

4. Click **Blogs** → **New Blog** to create posts

### Create a Team Member Content Type

1. Create folder:
```bash
mkdir templates/team
```

2. Create template `templates/team/member.njk`:
```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<div class="member">
  <img data-cms-region="photo" data-cms-type="image" data-cms-label="Photo" src="{{ content.photo }}" />
  <h2 data-cms-region="name" data-cms-type="text" data-cms-label="Name">{{ content.name }}</h2>
  <p data-cms-region="role" data-cms-type="text" data-cms-label="Role">{{ content.role }}</p>
  <p data-cms-region="bio" data-cms-type="richtext" data-cms-label="Bio">{{ content.bio | safe }}</p>
</div>
{% endblock %}
```

3. Sync templates → Navigate to **Teams** → Create team members

---

## Troubleshooting

### Migration fails
- Ensure database exists and is accessible
- Run: `node server/db/migrateContentTypes.js`
- Check database credentials in `.env`

### New content type doesn't appear
- Run template sync in admin panel
- Check `content_types` table: `SELECT * FROM content_types;`
- Verify `show_in_menu = TRUE` for the content type

### Generic editor doesn't load regions
- Check templates have `data-cms-region` attributes
- Verify `content_type` is set on template in database
- Run sync again: `/api/templates/sync`

### Old routes (/pages, /blocks) missing
- They still work, just duplicated by generic system
- Use either: `/pages` or `/:contentType` with `contentType=pages`
- Old components (Pages.jsx, Blocks.jsx) still exist

---

## Future Enhancements

1. **Unified Content Table**: Optional migration to single table
2. **Advanced Fields**: Repeaters, image galleries, relationships
3. **Role-based Access**: Permissions per content type
4. **Content Type Settings UI**: Admin page to customize icons, labels, ordering
5. **Import/Export**: Bulk operations for content
6. **Versioning**: Draft/published version comparison
7. **Scheduling**: Publish content at specific times

---

## Key Takeaways

✅ **Instant Content Types**: Add folder → get full CRUD interface
✅ **Zero Code Changes**: No backend modifications needed
✅ **Database Backed**: Fast queries with content_type indexing
✅ **Auto-Discovery**: New templates auto-register as content types
✅ **Backwards Compatible**: Old Pages/Blocks still work
✅ **Flexible**: Control labels, icons, features per type
✅ **SEO Ready**: Templates inherit SEO capabilities from pages
✅ **Responsive**: Mobile-friendly admin interface

---

## Quick Start Checklist

- [ ] Run migration: `node server/db/migrateContentTypes.js`
- [ ] Restart admin dev server: `npm run dev` (in admin/)
- [ ] Restart API: `npm run dev` (in server root)
- [ ] Go to Templates → **Sync from Filesystem**
- [ ] Create new folder in templates/: `mkdir templates/blog`
- [ ] Create template: `templates/blog/post.njk`
- [ ] Sync again
- [ ] Refresh admin → See new content type in menu!

**Done!** Your new content type is ready to use.
