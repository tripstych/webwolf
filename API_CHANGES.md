# API Changes Reference

## Summary of All API Modifications

### New Endpoint: Content Types API

#### GET /api/content-types
List all visible content types (for navigation)

**Response:**
```json
[
  {
    "id": 1,
    "name": "pages",
    "label": "Page",
    "plural_label": "Pages",
    "icon": "FileText",
    "color": "gray",
    "menu_order": 1,
    "show_in_menu": true,
    "has_status": true,
    "has_seo": true,
    "is_system": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "blocks",
    "label": "Block",
    "plural_label": "Blocks",
    "icon": "Boxes",
    "color": "gray",
    "menu_order": 2,
    "show_in_menu": true,
    "has_status": false,
    "has_seo": false,
    "is_system": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 3,
    "name": "blog",
    "label": "Blog",
    "plural_label": "Blogs",
    "icon": "BookOpen",
    "color": "gray",
    "menu_order": 999,
    "show_in_menu": true,
    "has_status": true,
    "has_seo": false,
    "is_system": false,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

**Status:** 200 OK
**Auth:** Required (any role)

---

#### GET /api/content-types/:name
Get a single content type by name

**Example:** `GET /api/content-types/blog`

**Response:**
```json
{
  "id": 3,
  "name": "blog",
  "label": "Blog",
  "plural_label": "Blogs",
  "icon": "BookOpen",
  "color": "gray",
  "menu_order": 999,
  "show_in_menu": true,
  "has_status": true,
  "has_seo": false,
  "is_system": false,
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Status:** 200 OK or 404 Not Found
**Auth:** Required (any role)

---

#### PUT /api/content-types/:name
Update a content type (admin only)

**Example:** `PUT /api/content-types/blog`

**Request Body:**
```json
{
  "label": "Blog Post",
  "plural_label": "Blog Posts",
  "icon": "Newspaper",
  "color": "blue",
  "menu_order": 5,
  "show_in_menu": true,
  "has_status": true,
  "has_seo": true
}
```

**Response:**
```json
{
  "success": true
}
```

**Status:** 200 OK or 404 Not Found
**Auth:** Required (admin only)

**Notes:**
- Cannot modify system content types (pages, blocks)
- All fields are optional
- Changes apply immediately

---

### Modified Endpoints: Templates

#### GET /api/templates
List templates with optional content type filtering

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| content_type | string | Filter by content type (e.g., "blog", "pages") |

**Examples:**
```
GET /api/templates                 # All non-block templates
GET /api/templates?content_type=blog   # Only blog templates
GET /api/templates?content_type=pages  # Only page templates
```

**Response Changes:**
- Added `content_type` field to each template object
- Unchanged response structure otherwise

**Status:** 200 OK
**Auth:** Required (any role)

---

#### GET /api/templates/blocks/list
List block templates

**Changes:**
- Now uses `content_type = 'blocks'` instead of filename pattern matching
- Same response structure as before

**Status:** 200 OK
**Auth:** Required (any role)

---

### Modified Endpoints: Pages

#### GET /api/pages
List pages with optional filtering

**New Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (draft, published, archived) |
| template_id | number | Filter by template ID |
| **content_type** | string | **NEW** - Filter by content type |

**Examples:**
```
GET /api/pages
GET /api/pages?status=published
GET /api/pages?template_id=1
GET /api/pages?content_type=pages        # Only pages
GET /api/pages?content_type=blog         # Only blog posts
GET /api/pages?content_type=pages&status=published
```

**Response:**
- Added `content_type` field to each page object
- Unchanged structure otherwise

**Status:** 200 OK
**Auth:** Required (any role)

---

#### POST /api/pages
Create a new page

**New Request Field:**
```json
{
  "template_id": 1,
  "title": "My Page",
  "slug": "/my-page",
  "content": {},
  "content_type": "pages",    // NEW - defaults to "pages"
  "status": "draft",
  "meta_title": "...",
  "meta_description": "..."
}
```

**Changes:**
- `content_type` field now accepted and stored
- Defaults to "pages" if not provided
- All other fields unchanged

**Status:** 201 Created
**Auth:** Required (editor+)

---

#### PUT /api/pages/:id
Update a page

**New Request Field:**
```json
{
  "content_type": "blog"   // NEW - can change content type
}
```

**Changes:**
- `content_type` field now accepted for updates
- All other fields unchanged

**Status:** 200 OK
**Auth:** Required (editor+)

---

#### GET /api/pages/:id
Get a single page

**Response Changes:**
- Added `content_type` field
- Added template_regions field (for editor)
- Unchanged structure otherwise

**Status:** 200 OK
**Auth:** Required (any role)

---

### Modified Endpoints: Blocks

#### GET /api/blocks
List blocks with optional filtering

**New Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| **content_type** | string | **NEW** - Filter by content type |

**Examples:**
```
GET /api/blocks                    # All blocks
GET /api/blocks?content_type=blocks    # Only blocks
```

**Response:**
- Added `content_type` field to each block object
- Unchanged structure otherwise

**Status:** 200 OK
**Auth:** Required (any role)

---

#### POST /api/blocks
Create a new block

**New Request Field:**
```json
{
  "template_id": 1,
  "name": "CTA Block",
  "description": "...",
  "content": {},
  "content_type": "blocks"   // NEW - defaults to "blocks"
}
```

**Changes:**
- `content_type` field now accepted and stored
- Defaults to "blocks" if not provided
- All other fields unchanged

**Status:** 201 Created
**Auth:** Required (editor+)

---

#### PUT /api/blocks/:id
Update a block

**New Request Field:**
```json
{
  "content_type": "blocks"   // NEW - can change content type
}
```

**Changes:**
- `content_type` field now accepted for updates
- All other fields unchanged

**Status:** 200 OK
**Auth:** Required (editor+)

---

#### GET /api/blocks/:id
Get a single block

**Response Changes:**
- Added `content_type` field
- Unchanged structure otherwise

**Status:** 200 OK
**Auth:** Required (any role)

---

## Backwards Compatibility

### ✅ All Existing Calls Still Work

**No breaking changes!** All existing API calls continue to work:

```javascript
// These all still work exactly as before:
GET /api/pages
GET /api/pages/:id
POST /api/pages
PUT /api/pages/:id
DELETE /api/pages/:id

GET /api/blocks
GET /api/blocks/:id
POST /api/blocks
PUT /api/blocks/:id
DELETE /api/blocks/:id

GET /api/templates
GET /api/templates/:id
POST /api/templates/sync
```

### New Fields Are Optional

- `content_type` field is optional in POST/PUT requests
- Defaults to appropriate value ("pages" or "blocks")
- Existing code doesn't need to change

### New Filtering Is Optional

- `content_type` query parameter is optional
- Omitting it returns all items as before
- Backwards compatible with existing queries

---

## Response Format Changes

### Before
```json
{
  "id": 1,
  "template_id": 1,
  "title": "Home",
  "slug": "/",
  "content": {},
  "status": "published",
  // ...
}
```

### After
```json
{
  "id": 1,
  "template_id": 1,
  "title": "Home",
  "slug": "/",
  "content": {},
  "content_type": "pages",    // ← NEW FIELD (non-breaking)
  "status": "published",
  // ... all other fields unchanged
}
```

**Impact:** Safe to add - existing code just ignores new field

---

## Error Responses

No new error types. All existing error handling remains the same:

```json
{
  "error": "Error message"
}
```

---

## Examples

### Create a Blog Post
```bash
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 5,
    "title": "My First Blog Post",
    "slug": "/my-first-blog-post",
    "content": {
      "post_title": "My First Blog Post",
      "post_body": "<p>Hello world!</p>"
    },
    "content_type": "blog",
    "status": "published"
  }'
```

### List Blog Posts Only
```bash
curl http://localhost:3000/api/pages?content_type=blog
```

### Get All Content Types
```bash
curl http://localhost:3000/api/content-types
```

### Update Blog Metadata
```bash
curl -X PUT http://localhost:3000/api/content-types/blog \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Blog Article",
    "icon": "Newspaper"
  }'
```

---

## Summary

| Change | Impact | Backwards Compatible |
|--------|--------|----------------------|
| New `/api/content-types` endpoint | Add navigation | Yes ✅ |
| New `content_type` field (pages/blocks) | Track content type | Yes ✅ |
| New `content_type` query parameter | Filter by type | Yes ✅ |
| New `content_type` field (templates) | Categorize templates | Yes ✅ |
| All existing fields/parameters | Unchanged | Yes ✅ |

**Status:** ✅ **All Changes Are Backwards Compatible**
