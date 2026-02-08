# WebWolf Template Builder

A drag-and-drop visual page builder for end consumers to create templates without technical knowledge.

## Features

- 🎨 Drag-and-drop interface for non-technical users
- 📦 Component library (Hero, Cards, Text, Images, etc.)
- 🔧 Resize elements with handles
- 📝 Mark elements as editable (becomes CMS region)
- 🔁 Mark sections as repeating (for lists/galleries)
- 💾 Direct filesystem save (generates .njk files)
- 📐 Absolutify/relativize technique for layout preservation
- 🎯 Project management (collection of templates)

## Project Structure

```
builder/
├── server/             # Backend API (Express on port 4000)
│   ├── api/           # Route handlers
│   ├── services/      # Business logic
│   ├── db/            # JSON storage
│   └── index.js       # Express app
└── frontend/          # React frontend (Vite on port 5174)
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   └── App.jsx
    └── index.html
```

## Getting Started

### Backend Setup

```bash
cd builder/server
npm install
npm run dev  # Runs on http://localhost:4000
```

### Frontend Setup

```bash
cd builder/frontend
npm install
npm run dev  # Runs on http://localhost:5174
```

Open http://localhost:5174 in your browser.

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Templates
- `GET /api/templates/project/:projectId` - Get project templates
- `POST /api/templates` - Create template
- `GET /api/templates/:templateId/project/:projectId` - Get template
- `PUT /api/templates/:templateId/project/:projectId` - Update template
- `DELETE /api/templates/:templateId/project/:projectId` - Delete template

### Components
- `GET /api/components` - Get all component definitions
- `GET /api/components/:type` - Get single component definition

### Generation
- `POST /api/generate/nunjucks` - Generate Nunjucks template
- `POST /api/generate/save` - Generate and save template file
- `POST /api/generate/preview` - Preview template with sample data

## Key Concepts

### Absolutify/Relativize Technique

1. **Design Phase**: User drags/drops elements in normal flow layout
2. **Absolutify**: Before saving, convert all elements to `position: absolute`
3. **Capture**: Get computed `top`, `left`, `width`, `height` of each element
4. **Relativize**: Convert absolute values back to relative units (%, rem, etc.)
5. **Generate**: Create Nunjucks template with preserved layout

### CMS Regions

Mark components as editable to make them CMS regions:
- Becomes `{{ content.region_name }}` in generated template
- User can edit via CMS when publishing

### Repeating Sections

Mark sections as repeating for lists/galleries:
- Becomes `{% for item in content.items %}`
- Perfect for product lists, galleries, testimonials

## Component Types

- **Hero** - Large header section
- **Text Block** - Simple text content
- **Image** - Image with alt text
- **Card** - Card with title/description/image
- **Card Grid** - Grid layout for cards
- **Button** - Clickable button with link

## Data Models

### Project
```javascript
{
  id: 'string',
  name: 'string',
  description: 'string',
  templates: [],
  created_at: 'ISO string',
  updated_at: 'ISO string'
}
```

### Template
```javascript
{
  id: 'string',
  name: 'string',
  type: 'page', // or 'block'
  contentType: 'pages', // maps to CMS content type
  structure: {
    components: [/* component array */]
  },
  created_at: 'ISO string',
  updated_at: 'ISO string'
}
```

### Component
```javascript
{
  id: 'string',
  type: 'hero', // component type
  props: {}, // component-specific properties
  position: { x: '0', y: '0' },
  size: { width: '100%', height: 'auto' },
  isEditable: false,
  isRepeating: false,
  cmsRegion: {
    name: 'hero_title',
    type: 'text',
    label: 'Hero Title'
  },
  children: []
}
```

## Workflow

1. **Create Project** - Organize templates by project
2. **Create Template** - Start building a new page template
3. **Drag Components** - Build layout by dragging components from library
4. **Resize Elements** - Use handles to adjust component sizes
5. **Mark as Editable** - Right-click and mark regions for CMS editing
6. **Save** - Click Save to generate .njk file
7. **Use in CMS** - Reference template in WebWolf CMS

## Output

Generated Nunjucks templates are saved to the main server's `templates/` directory:

```nunjucks
{# Generated template: My Template #}
{% extends "layouts/base.njk" %}

{% block content %}
<div class="template-my-template">
  <div data-cms-region="hero_title" data-cms-type="text">
    {{ content.hero_title }}
  </div>
</div>
{% endblock %}
```

## Future Enhancements

- [ ] Repeating sections with nested components
- [ ] Block insertion from CMS
- [ ] Styling controls (colors, fonts, spacing)
- [ ] Responsive preview (mobile/tablet/desktop)
- [ ] Template preview with sample data
- [ ] Import existing templates
- [ ] Undo/redo functionality
- [ ] Template versioning
- [ ] Collaborative editing
- [ ] Theme marketplace
