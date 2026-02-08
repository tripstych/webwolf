# Testing Guide: Flexible Content Types System

## Pre-Testing Checklist

- [ ] Node.js v16+ installed
- [ ] MySQL server running
- [ ] `.env` file configured with database credentials
- [ ] All code changes completed
- [ ] Dependencies installed (`npm install` in both server and admin folders)

---

## Phase 1: Database Tests

### Test 1.1: Run Migration
```bash
cd F:/webwolf
node server/db/migrateContentTypes.js
```

**Expected Output:**
```
🔄 Running content types migration...
✅ Added content_type to pages table
✅ Added content_type to blocks table
✅ Added content_type to templates table
✅ Created/verified content_types table
✅ Seeded default content types
🔄 Syncing templates and discovering content types...
✅ Synced X templates
✅ Updated existing pages with content_type
✅ Updated existing blocks with content_type

✨ Content types migration completed successfully!
```

**Pass Criteria:**
- ✅ No errors printed
- ✅ All content types migration messages shown
- ✅ Process completes without exit code 1

---

### Test 1.2: Verify Database Tables and Columns

```bash
mysql -u root -p webwolf_cms
```

Check tables:
```sql
-- Check content_types table exists
DESCRIBE content_types;

-- Should show columns:
-- id, name, label, plural_label, icon, color, menu_order,
-- show_in_menu, has_status, has_seo, is_system, created_at, updated_at

-- Check pages table has content_type
DESCRIBE pages;
-- Should show: content_type VARCHAR(50)

-- Check blocks table has content_type
DESCRIBE blocks;
-- Should show: content_type VARCHAR(50)

-- Check templates table has content_type
DESCRIBE templates;
-- Should show: content_type VARCHAR(50)

-- Verify default content types
SELECT * FROM content_types;
-- Should show at least 'pages' and 'blocks'

-- Check template content_type was populated
SELECT filename, content_type FROM templates LIMIT 5;
-- All should have content_type set
```

**Pass Criteria:**
- ✅ All columns exist with correct types
- ✅ Default content types exist (pages, blocks)
- ✅ Template content_type populated for all templates

---

## Phase 2: Backend API Tests

### Test 2.1: Start Backend Server
```bash
cd F:/webwolf
npm run dev
```

**Expected:**
```
✓ listening on port 3000
```

### Test 2.2: Test Content Types Endpoint

```bash
# List all content types
curl http://localhost:3000/api/content-types

# Should return JSON array with at least:
# [
#   { id: 1, name: "pages", ... },
#   { id: 2, name: "blocks", ... }
# ]
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Returns JSON array
- ✅ Contains "pages" and "blocks"

### Test 2.3: Test Content Type Filtering

```bash
# List pages only
curl 'http://localhost:3000/api/pages?content_type=pages'

# List blocks only
curl 'http://localhost:3000/api/blocks?content_type=blocks'

# List templates for pages
curl 'http://localhost:3000/api/templates?content_type=pages'
```

**Pass Criteria:**
- ✅ All return 200 status
- ✅ Pages endpoint returns pages with content_type='pages'
- ✅ Blocks endpoint returns blocks with content_type='blocks'
- ✅ Templates endpoint returns templates with content_type='pages'

### Test 2.4: Test Creating Page with Content Type

```bash
curl -X POST http://localhost:3000/api/pages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "title": "Test Page",
    "slug": "/test-page",
    "content": {},
    "content_type": "pages",
    "status": "draft"
  }'
```

**Pass Criteria:**
- ✅ Returns 201 Created
- ✅ Response includes content_type: "pages"
- ✅ Page saved in database with correct content_type

---

## Phase 3: Frontend Tests

### Test 3.1: Start Admin Frontend
```bash
cd F:/webwolf/admin
npm run dev
```

**Expected:**
```
✓ ready on http://localhost:5173
```

### Test 3.2: Login to Admin Panel

1. Navigate to `http://localhost:5173`
2. Login with default credentials (admin@example.com / admin123)

**Pass Criteria:**
- ✅ Loads without errors
- ✅ AuthContext working
- ✅ Logged in successfully

### Test 3.3: Verify ContentTypesContext is Loading

Open browser console (F12):
```javascript
// Should not show errors related to ContentTypesContext
// Check Network tab → should see GET /api/content-types
```

**Pass Criteria:**
- ✅ No errors in console
- ✅ Network shows successful /api/content-types request
- ✅ Content types loaded from API

### Test 3.4: Check Navigation Menu

1. Look at left sidebar
2. Should show:
   - Dashboard
   - Pages
   - Templates
   - Media
   - Menus
   - Blocks
   - SEO
   - Settings

**Pass Criteria:**
- ✅ All expected items present
- ✅ "Pages" and "Blocks" visible
- ✅ No errors in console

---

## Phase 4: Template Sync Tests

### Test 4.1: Sync Templates from Admin

1. Click **Templates** in sidebar
2. Look for **Sync from Filesystem** button
3. Click the button
4. Wait for success message

**Expected Response:**
```
✅ Synced X templates successfully
```

**Pass Criteria:**
- ✅ Sync button visible
- ✅ No errors
- ✅ Success message shown
- ✅ Page updates with template count

### Test 4.2: Verify Templates Synced

```bash
mysql webwolf_cms -e "SELECT COUNT(*) as count FROM templates;"
```

**Pass Criteria:**
- ✅ Count > 0
- ✅ Matches number shown in success message

---

## Phase 5: Dynamic Content Type Tests

### Test 5.1: Create New Content Type (Blog)

**Step 1: Create folder**
```bash
mkdir F:\webwolf\templates\blog
```

**Step 2: Create template file** `templates/blog/post.njk`
```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article>
  <h1 data-cms-region="blog_title"
      data-cms-type="text"
      data-cms-label="Blog Title">
    {{ content.blog_title }}
  </h1>
  <div data-cms-region="blog_body"
       data-cms-type="richtext"
       data-cms-label="Blog Body">
    {{ content.blog_body | safe }}
  </div>
</article>
{% endblock %}
```

**Step 3: Verify file created**
```bash
ls -la F:\webwolf\templates\blog\
# Should show: post.njk
```

**Pass Criteria:**
- ✅ Folder created
- ✅ post.njk file exists
- ✅ File contains CMS regions

### Test 5.2: Sync New Template

1. Admin → **Templates**
2. Click **Sync from Filesystem**
3. Check success message

**Pass Criteria:**
- ✅ Sync succeeds
- ✅ No errors

### Test 5.3: Verify Blog Type Auto-Created

In database:
```sql
SELECT * FROM content_types WHERE name = 'blog';
```

**Expected:**
```
id: 3 (or next ID)
name: blog
label: Blog
plural_label: Blogs
icon: BookOpen
has_status: 1
has_seo: 0
is_system: 0
```

**Pass Criteria:**
- ✅ Blog row exists
- ✅ Label is "Blog"
- ✅ Icon is "BookOpen"

---

## Phase 6: Frontend Dynamic Routes Tests

### Test 6.1: Refresh Admin Panel
```
Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

**Pass Criteria:**
- ✅ Page loads without errors
- ✅ "Blogs" now appears in sidebar between Pages/Templates

### Test 6.2: Navigate to Blog List

1. Click **Blogs** in sidebar
2. Page should load showing empty blog list

**Expected:**
- Title: "Blogs"
- "New Blog" button
- Empty table with headers: Title, Template, Status, Updated, Actions

**Pass Criteria:**
- ✅ Page loads
- ✅ Title is "Blogs"
- ✅ "New Blog" button visible
- ✅ Empty table shown

### Test 6.3: Create New Blog Post

1. Click **Blogs** → **New Blog** button
2. Select template: "Post"
3. Enter title: "My First Blog"
4. Enter slug: "my-first-blog"
5. Fill blog_body with some text
6. Status: "Draft"
7. Click **Save**

**Expected:**
- Form loads with template dropdown
- Can select "Post" template
- Regions appear (blog_title, blog_body)
- Save button works
- Redirects to edit page
- Success message appears

**Pass Criteria:**
- ✅ All form fields visible
- ✅ Post created successfully
- ✅ Redirected to blog/:id route
- ✅ Can edit the post

### Test 6.4: List Blog Post

1. Click **Blogs** in sidebar
2. Should see the created blog post

**Expected:**
- Title: "My First Blog"
- Slug: "my-first-blog"
- Status: "draft"
- Edit and delete buttons

**Pass Criteria:**
- ✅ Blog post appears in list
- ✅ All details correct
- ✅ Action buttons present

### Test 6.5: Edit Blog Post

1. Click edit icon on blog post
2. Change title: "My Updated Blog"
3. Click **Save**

**Expected:**
- Form pre-populated with existing data
- Changes saved
- Success message shown
- Changes visible in list

**Pass Criteria:**
- ✅ All data pre-loaded
- ✅ Changes save successfully
- ✅ Changes visible in list

### Test 6.6: Delete Blog Post

1. Click delete icon on blog post
2. Confirm deletion

**Expected:**
- Confirmation dialog appears
- Post deleted
- Post no longer in list

**Pass Criteria:**
- ✅ Confirmation shown
- ✅ Post deleted
- ✅ List updated

---

## Phase 7: Backwards Compatibility Tests

### Test 7.1: Old Pages Route Still Works

1. Click **Pages** in sidebar
2. Should see existing pages

**Pass Criteria:**
- ✅ Pages load
- ✅ Existing pages visible
- ✅ Can create/edit/delete

### Test 7.2: Old Blocks Route Still Works

1. Click **Blocks** in sidebar
2. Should see existing blocks

**Pass Criteria:**
- ✅ Blocks load
- ✅ Existing blocks visible
- ✅ Can create/edit/delete

### Test 7.3: Old API Routes Still Work

```bash
# These should all still work
curl http://localhost:3000/api/pages
curl http://localhost:3000/api/blocks
curl http://localhost:3000/api/templates
```

**Pass Criteria:**
- ✅ All return 200 status
- ✅ Return expected data

---

## Phase 8: Conditional Features Tests

### Test 8.1: Pages Have SEO and Status

Create new page:
1. Click **Pages** → **New Page**
2. Should see:
   - Status dropdown (Draft/Published/Archived)
   - SEO section (Meta Title, Meta Description)

**Pass Criteria:**
- ✅ Status dropdown visible
- ✅ SEO section visible

### Test 8.2: Blogs Have Status but No SEO

Create new blog post:
1. Click **Blogs** → **New Blog**
2. Should see:
   - Status dropdown (Draft/Published/Archived)
   - NO SEO section

**Pass Criteria:**
- ✅ Status dropdown visible
- ✅ No SEO section

### Test 8.3: Blocks Have No Status or SEO

Create new block:
1. Click **Blocks** → **New Block**
2. Should NOT see:
   - Status dropdown
   - SEO section

**Pass Criteria:**
- ✅ No status dropdown
- ✅ No SEO section

---

## Phase 9: Content Filtering Tests

### Test 9.1: Search Functionality

1. Go to **Blogs**
2. Type search term in search box
3. Results filtered in real-time

**Pass Criteria:**
- ✅ Search filters results
- ✅ Works for title, slug, name

### Test 9.2: Status Filtering (if has_status=true)

1. Go to **Pages** or **Blogs**
2. Use status dropdown to filter
3. Results show only selected status

**Pass Criteria:**
- ✅ Status filter visible
- ✅ Filters results correctly

---

## Final Comprehensive Test

### Create Multiple Content Types

1. Create `templates/news/` with template
2. Create `templates/team/` with template
3. Sync templates
4. Verify all appear in navigation
5. Create items in each type

**Expected:**
- News appears in navigation
- Team appears in navigation
- Can create/edit/delete in each
- No conflicts or errors

**Pass Criteria:**
- ✅ Multiple content types work
- ✅ No navigation conflicts
- ✅ All CRUD operations work
- ✅ No console errors

---

## Regression Tests

### Existing Functionality Still Works

- [ ] Can create/edit/delete pages
- [ ] Can create/edit/delete blocks
- [ ] Can create/edit/delete templates
- [ ] Can upload media
- [ ] Can manage menus
- [ ] Can access settings
- [ ] Can view dashboard
- [ ] Can access SEO page
- [ ] Authentication still works
- [ ] User menu still works
- [ ] Sidebar collapse/expand works
- [ ] Mobile responsive works

---

## Performance Tests

### Check Response Times

```bash
# Test list endpoint
time curl http://localhost:3000/api/pages

# Test content types endpoint
time curl http://localhost:3000/api/content-types

# Test template sync
# (measure in admin panel)
```

**Pass Criteria:**
- ✅ List endpoints respond in <100ms
- ✅ Template sync completes in <2s
- ✅ No console errors or warnings

---

## Browser Compatibility Tests

Test in:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (latest)

**Pass Criteria:**
- ✅ All features work
- ✅ No console errors in any browser
- ✅ Responsive design works

---

## Test Results Summary

| Phase | Test | Status | Notes |
|-------|------|--------|-------|
| 1 | Migration | ⬜ | |
| 1 | Database tables | ⬜ | |
| 2 | Backend server | ⬜ | |
| 2 | Content types API | ⬜ | |
| 2 | Content type filtering | ⬜ | |
| 2 | Create with content_type | ⬜ | |
| 3 | Frontend loads | ⬜ | |
| 3 | Login works | ⬜ | |
| 3 | Context loads | ⬜ | |
| 3 | Navigation menu | ⬜ | |
| 4 | Template sync | ⬜ | |
| 4 | Templates synced | ⬜ | |
| 5 | Create new content type | ⬜ | |
| 5 | Auto-registration | ⬜ | |
| 5 | Verify in database | ⬜ | |
| 6 | Blog list page | ⬜ | |
| 6 | Create blog post | ⬜ | |
| 6 | Edit blog post | ⬜ | |
| 6 | Delete blog post | ⬜ | |
| 7 | Old pages work | ⬜ | |
| 7 | Old blocks work | ⬜ | |
| 7 | Old API works | ⬜ | |
| 8 | Pages have SEO | ⬜ | |
| 8 | Pages have status | ⬜ | |
| 8 | Blogs have status | ⬜ | |
| 8 | Blogs no SEO | ⬜ | |
| 8 | Blocks no status/SEO | ⬜ | |
| 9 | Search works | ⬜ | |
| 9 | Filtering works | ⬜ | |

**Fill in status as tests complete:**
- ✅ = PASS
- ❌ = FAIL
- ⏭️ = SKIP
- ⬜ = NOT RUN

---

## Issues Found

Document any issues encountered:

| Issue | Severity | Fix | Status |
|-------|----------|-----|--------|
| | | | |

---

## Sign-Off

- **Tested By:** _________________
- **Date:** _________________
- **Overall Status:** ✅ PASS / ❌ FAIL
- **Notes:** ___________________

---

**Ready to deploy!** 🚀
