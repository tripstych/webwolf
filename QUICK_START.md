# Quick Start: Flexible Content Types

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Run Migration (1 minute)
```bash
cd F:/webwolf
node server/db/migrateContentTypes.js
```

**What it does:**
- Adds `content_type` column to pages, blocks, templates
- Creates `content_types` metadata table
- Seeds "Pages" and "Blocks" as system types
- Scans templates and auto-registers any new types found

### Step 2: Restart Servers (2 minutes)

**Terminal 1 - Backend:**
```bash
cd F:/webwolf
npm run dev
```

**Terminal 2 - Admin Frontend:**
```bash
cd F:/webwolf/admin
npm run dev
```

Wait for both to say "ready" or "listening".

### Step 3: Sync Templates (1 minute)

1. Open admin panel: http://localhost:5173
2. Go to **Templates** page
3. Click **Sync from Filesystem** button
4. Wait for confirmation message

### Step 4: See It In Action (1 minute)

✅ **Refresh the admin page** (Ctrl+Shift+R)

You should now see:
- **Dashboard**, **Pages**, **Templates**, **Media**, **Menus**, **Blocks**, **SEO**, **Settings** in sidebar
- New content types will appear between Pages and Templates

---

## 📝 Create Your First Custom Content Type

### Make a Blog Content Type

**Step 1: Create folder**
```bash
mkdir F:\webwolf\templates\blog
```

**Step 2: Create template** `templates/blog/post.njk`
```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<article>
  <h1 data-cms-region="post_title"
      data-cms-type="text"
      data-cms-label="Post Title">
    {{ content.post_title }}
  </h1>

  <div data-cms-region="post_body"
       data-cms-type="richtext"
       data-cms-label="Post Body">
    {{ content.post_body | safe }}
  </div>
</article>
{% endblock %}
```

**Step 3: Sync again**
- Admin → Templates → **Sync from Filesystem**

**Step 4: Done!** 🎉
- **Blog** now appears in navigation
- Click to create blog posts!

---

## 🔥 What Just Happened?

| Action | Result |
|--------|--------|
| Created `templates/blog/` folder | System extracts "blog" as content type name |
| Created `post.njk` template | Template registered with blog content type |
| Ran sync | "Blog" auto-created in `content_types` table |
| Synced templates | Blog routes (list, create, edit) auto-generated |
| Refreshed admin | "Blog" menu item appeared with BookOpen icon |

---

## 📊 Content Type Auto-Defaults

When you create a new folder, the system automatically:

| Folder Name | Label | Plural | Icon | Status | SEO |
|-------------|-------|--------|------|--------|-----|
| `blog` | Blog | Blogs | BookOpen | ✅ | ❌ |
| `products` | Product | Products | Package | ✅ | ❌ |
| `team` | Team | Teams | Users | ✅ | ❌ |
| `portfolio` | Portfolio | Portfolios | Briefcase | ✅ | ❌ |
| `news` | News | News | Newspaper | ✅ | ❌ |

---

## 🎯 Common Tasks

### View all Blog Posts
```
Go to admin → Click "Blogs" in sidebar
```

### Create New Blog Post
```
Click "Blogs" → Click "New Blog" button
Select template → Fill content → Save
```

### Edit Blog Post
```
Click "Blogs" → Find post in list → Click edit icon
```

### Delete Blog Post
```
Click "Blogs" → Find post → Click trash icon → Confirm
```

### Change Blog Label/Icon
```bash
# Change label to "Articles" and icon to Newspaper
mysql webwolf_cms -e "
UPDATE content_types
SET label = 'Article',
    plural_label = 'Articles',
    icon = 'Newspaper'
WHERE name = 'blog';
"
```

Then refresh admin page.

---

## ❓ FAQ

**Q: Do I need to edit any code?**
A: Nope! Just create folders and sync.

**Q: Can I hide content types?**
A: Yes, in admin: Content Types Settings (coming soon) or via database

**Q: What about status/publish dates?**
A: Auto-enabled for all custom types. Blocks don't have status.

**Q: Can SEO fields be enabled?**
A: Currently default to off. Enable per-type via database:
```sql
UPDATE content_types SET has_seo = TRUE WHERE name = 'blog';
```

**Q: How do I delete a content type?**
A: System types (pages, blocks) can't be deleted. Custom types can be deleted if no content exists using the content type settings (feature coming soon).

---

## 🐛 Troubleshooting

### "Blog" menu item not appearing
1. Did you run migration? `node server/db/migrateContentTypes.js`
2. Did you sync templates? Admin → Templates → Sync
3. Did you refresh page? Hard refresh: `Ctrl+Shift+R`

### Cannot create blog post
1. Check that blog template exists: `templates/blog/post.njk`
2. Template must have `data-cms-region` attributes
3. Verify template was synced: Admin → Templates

### Old pages missing
They're not missing! You can use either:
- Old route: `/pages`
- New generic: `/?contentType=pages`

Both work identically.

---

## 📚 Next Steps

1. **Read full docs**: `CONTENT_TYPES_IMPLEMENTATION.md`
2. **Check templates**: See `templates/` folder for examples
3. **Create more types**: Repeat the blog example with different content
4. **Customize**: Update labels, icons, features in database

---

## 📦 File Structure After Implementation

```
webwolf/
├── server/
│   ├── api/
│   │   ├── contentTypes.js          ← NEW
│   │   ├── index.js                 (updated)
│   │   ├── pages.js                 (updated)
│   │   ├── blocks.js                (updated)
│   │   └── templates.js             (updated)
│   ├── db/
│   │   ├── migrate.js               (updated)
│   │   ├── seed.js                  (updated)
│   │   └── migrateContentTypes.js   ← NEW
│   └── services/
│       └── templateParser.js        (updated)
├── admin/src/
│   ├── context/
│   │   └── ContentTypesContext.jsx  ← NEW
│   ├── pages/
│   │   ├── ContentList.jsx          ← NEW
│   │   ├── ContentEditor.jsx        ← NEW
│   │   ├── Pages.jsx                (still works)
│   │   └── Blocks.jsx               (still works)
│   ├── components/
│   │   └── Layout.jsx               (updated)
│   ├── App.jsx                      (updated)
│   └── main.jsx                     (updated)
└── templates/
    ├── pages/                       (existing)
    ├── blocks/                      (existing)
    ├── blog/                        ← YOUR NEW TYPE
    └── ...
```

---

## 💡 Key Concepts

**Content Type**: A category of content (Pages, Blogs, Products, etc.)
- Stored in `content_types` table
- Has metadata: name, label, icon, features

**Template**: A Nunjucks file defining HTML structure
- Located in `templates/` folder
- Uses `data-cms-` attributes to mark editable regions
- Belongs to one content type (folder name)

**Content**: Actual data (pages, blog posts, etc.)
- Stored in `pages` or `blocks` table (+ content_type)
- Each has `content` JSON field storing region values

**Dynamic Routes**: Auto-generated for each content type
- List: `/:contentType`
- Create: `/:contentType/new`
- Edit: `/:contentType/:id`

---

## ✨ Summary

You now have a **flexible, infinitely extensible content management system**!

Adding a new content type is literally:
1. Create a folder in `templates/`
2. Create a `.njk` template file
3. Sync templates
4. **Done!** Full UI generated automatically

No code changes. No deployments. Just folders and syncing.

---

**Need help?** Check `CONTENT_TYPES_IMPLEMENTATION.md` for detailed docs.

**Ready to build?** Start creating folders in `templates/`! 🚀
