# WebWolf Template Builder - Quick Start Guide

## 🚀 Start Here

### What is the Template Builder?

A **visual drag-and-drop page builder** for creating Nunjucks templates without writing code. Designed for content managers and template designers.

### In 60 seconds...

1. **Run backend**: `cd builder/server && npm run dev`
2. **Run frontend**: `cd builder/frontend && npm run dev`
3. **Open browser**: http://localhost:5174
4. **Create project** → **Create template** → **Drag components** → **Save**
5. **Find saved template** in `server/templates/` folder

---

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Terminal/Command Line

### Step 1: Install Backend

```bash
cd builder/server
npm install
```

### Step 2: Install Frontend

```bash
cd builder/frontend
npm install
```

## Running

### Open 2 Terminals

**Terminal 1 - Backend:**
```bash
cd builder/server
npm run dev
```

Expected output:
```
🎨 Template Builder running on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd builder/frontend
npm run dev
```

Expected output:
```
VITE running on http://localhost:5174
```

## Using the Builder

### 1. Create Your First Project

- Open http://localhost:5174 in your browser
- Click **"Create First Project"**
- Enter name: "My Website"
- Click **Create**

### 2. Create a Template

- In the left sidebar under "Templates", click **"+ New Template"**
- Enter name: "Homepage"
- Click **Create**

### 3. Add Components

**Drag components from the left library to the canvas:**

1. Drag **Hero Section**
   - Drop it on the white canvas
   - It appears on the canvas!

2. Drag **Text Block**
   - Position below the hero
   - Edit the text in the right panel

3. Drag **Card Grid**
   - Add some card components
   - Customize in the right panel

### 4. Customize Components

**Click a component to select it:**

- Right panel shows **Properties**
- Edit width, height, content
- Adjust colors, text, images

### 5. Mark as Editable (CMS Region)

**Make a component editable in the CMS:**

1. Click to select component
2. In right panel, check **"Mark as editable (CMS region)"**
3. Component becomes `{{ content.region_name }}` in template

### 6. Mark as Repeating (for Lists)

**Create a repeating section:**

1. Click a component
2. In right panel, check **"Mark as repeating (list)"**
3. Becomes `{% for item in content.items %}` in template

### 7. Save Template

- Click **"Save"** in the toolbar
- Template generates as `.njk` file
- Shows file path in success message

### 8. Find Your Template

Check `server/templates/` folder - your `.njk` file is there!

---

## Understanding the Output

### Example Generated Template

When you save a template with editable sections:

```nunjucks
{% extends "layouts/base.njk" %}

{% block content %}
<div class="template-homepage">

  {# Hero section #}
  <div data-component-id="1234" style="width: 100%; height: 600px">
    <section class="hero">
      <h1>Welcome to Our Site</h1>
    </section>
  </div>

  {# Editable content region #}
  <div data-cms-region="main_content" data-cms-type="text">
    {{ content.main_content }}
  </div>

  {# Repeating section #}
  <div data-cms-region="products" data-cms-type="repeater">
    {% for item in content.products %}
      <div class="product-card">
        {{item.title}}
      </div>
    {% endfor %}
  </div>

</div>
{% endblock %}
```

---

## Component Types

### 1. Hero Section
- Large header with optional background image
- title, subtitle, height customizable
- Perfect for page headers

### 2. Text Block
- Simple paragraph text
- Font size, color customizable
- Great for descriptions

### 3. Image
- Image with alt text
- Resizable and customizable
- Use for photos, graphics

### 4. Button
- Clickable button
- Customize text, link, color
- CTA elements

### 5. Card
- Card with image, title, description
- Perfect for products, team members
- Resizable

### 6. Card Grid
- Container for multiple cards
- Grid layout with customizable columns
- Great for galleries, product lists

---

## Project Structure

```
MyWebsite (Project)
├── Homepage (Template 1)
│   ├── Hero Section
│   ├── Features Grid (4 cards)
│   └── CTA Section
└── About Us (Template 2)
    ├── Hero
    ├── Team Members (repeating)
    └── Contact Form
```

---

## Tips & Best Practices

### 1. Organize with Projects
- Group related templates by project
- One project per website/app
- Example: "MyCompany.com", "Admin Panel"

### 2. Use Meaningful Names
- Template: "Homepage", "Product Page", "Blog Post"
- CMS Regions: "hero_title", "main_content", "sidebar"
- Components: specific to content type

### 3. Mark Content as Editable
- Only mark content that changes per page
- Static header/footer usually doesn't need marking
- Dynamic content always should be marked

### 4. Repeating Sections
- Use for lists, galleries, team members
- Perfect for product catalogs
- Good for testimonials, case studies

### 5. Test Your Template
- After saving, check the generated .njk file
- Look for `{{ content.region }}` placeholders
- Verify repeater loops `{% for item %}`

---

## Troubleshooting

### "Can't connect to backend"
- Make sure backend is running: `npm run dev` in `builder/server`
- Check port 4000 is not in use
- Look for 🎨 message in terminal

### "Components not showing"
- Check browser console for errors (F12)
- Verify backend health: `curl http://localhost:4000/health`
- Try refreshing page

### "Can't save template"
- Make sure both servers are running
- Check `builder/server/db/` directory exists
- Check file permissions in `server/templates/` folder

### "Resize handles not working"
- Click component first to select it
- Handles should appear as blue dots
- Drag from the corner or edges

### "Lost my project"
- Projects are saved in `builder/server/db/projects.json`
- Stop the server and check file permissions
- Don't delete this file!

---

## Keyboard Shortcuts

- **Click component** - Select it
- **Delete key** - Delete selected component (when right panel is focused)
- **Escape** - Deselect component

---

## API Endpoints (If You Need Them)

```bash
# Get projects
curl http://localhost:4000/api/projects

# Get component library
curl http://localhost:4000/api/components

# Create project
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"test"}'

# Health check
curl http://localhost:4000/health
```

---

## File Locations

```
builder/
├── server/
│   ├── db/projects.json          ← Your projects & templates
│   └── index.js
├── frontend/
│   ├── src/App.jsx               ← Main app
│   └── index.html
└── templates/                     ← Saved .njk files
    └── homepage.njk
```

---

## Next: Connect to WebWolf CMS

Once you've created templates, you can use them in the main CMS:

1. Copy the `.njk` file path
2. Reference in CMS content type definition
3. Use template for creating content
4. Edit content via CMS, template handles rendering

---

## Getting Help

1. **Check SETUP.md** - Installation issues
2. **Check ARCHITECTURE.md** - How it works
3. **Check README.md** - Feature overview
4. **Browser console** (F12) - JavaScript errors
5. **Server logs** - Terminal where you ran `npm run dev`

---

## What's Next?

- [ ] Create 3+ templates
- [ ] Mark regions as editable
- [ ] Save and review generated files
- [ ] Create repeating sections
- [ ] Connect to WebWolf CMS
- [ ] Customize component library
- [ ] Add custom components

---

## Key Features You Have Now

✅ Drag-and-drop builder
✅ 6 component types
✅ Resizable components
✅ Project management
✅ Template generation
✅ CMS region marking
✅ Repeating sections
✅ Auto-save to .njk files

---

## Happy Building! 🎨

Questions? Check the documentation files in this folder.

Need help? All errors and logs are printed in your terminal.

Ready? Start with step 1: **Installation**
