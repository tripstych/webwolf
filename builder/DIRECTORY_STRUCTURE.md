# Directory Structure - WebWolf Template Builder

Complete file listing with descriptions.

## Root Level

```
builder/
├── README.md                    # Main project overview
├── QUICKSTART.md               # Quick start guide (START HERE)
├── SETUP.md                    # Installation and verification
├── ARCHITECTURE.md             # System design and data flow
├── MANIFEST.md                 # Implementation checklist
├── DIRECTORY_STRUCTURE.md      # This file
├── test-api.sh                 # API testing script
├── .gitignore                  # Git ignore rules
├── server/                     # Backend application
└── frontend/                   # Frontend application
```

---

## Backend Directory

```
builder/server/
├── package.json                # npm dependencies and scripts
├── .env.example               # Environment variables template
├── index.js                   # Express app entry point
├── node_modules/              # Installed dependencies
├── db/
│   └── projects.json          # Project and template storage
└── api/
    ├── projects.js            # Project CRUD routes
    ├── templates.js           # Template CRUD routes
    ├── components.js          # Component definitions
    └── generate.js            # Template generation routes
└── services/
    ├── templateGenerator.js   # JSON → Nunjucks conversion
    └── fileWriter.js          # File system operations
```

### Backend Files Detail

#### `index.js` (Express Entry Point)
- Initializes Express server on port 4000
- Configures CORS middleware
- Registers all API routes
- Health check endpoint

#### `api/projects.js`
- GET /api/projects - List all projects
- GET /api/projects/:id - Get single project
- POST /api/projects - Create project
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Delete project

#### `api/templates.js`
- GET /api/templates/project/:projectId - List templates
- GET /api/templates/:templateId/project/:projectId - Get template
- POST /api/templates - Create template
- PUT /api/templates/:templateId/project/:projectId - Update template
- DELETE /api/templates/:templateId/project/:projectId - Delete template

#### `api/components.js`
- GET /api/components - All component definitions
- GET /api/components/:type - Single component definition
- Pre-defined component library

#### `api/generate.js`
- POST /api/generate/nunjucks - Generate HTML only
- POST /api/generate/save - Generate and save .njk file
- POST /api/generate/preview - Preview with sample data

#### `services/templateGenerator.js`
Key functions:
- `generateNunjucksTemplate(template)` - Main generation
- `generateComponentHTML(component)` - Component to HTML
- `generateInlineStyles(component)` - Style attributes
- `generateDataAttributes(component)` - CMS data attrs
- `generateComponentContent(component)` - Component-specific markup

#### `services/fileWriter.js`
Key functions:
- `writeTemplateFile()` - Save .njk to disk
- `readTemplateFile()` - Read template file
- `deleteTemplateFile()` - Remove template file
- `listTemplateFiles()` - List all templates

#### `db/projects.json`
Auto-created JSON database:
```json
{
  "projects": [
    {
      "id": "1234567890",
      "name": "My Website",
      "description": "Main website",
      "templates": [
        {
          "id": "9876543210",
          "name": "Homepage",
          "structure": {
            "components": [...]
          },
          "created_at": "2026-02-04T00:00:00Z",
          "updated_at": "2026-02-04T00:00:00Z"
        }
      ],
      "created_at": "2026-02-04T00:00:00Z",
      "updated_at": "2026-02-04T00:00:00Z"
    }
  ]
}
```

---

## Frontend Directory

```
builder/frontend/
├── package.json               # npm dependencies and scripts
├── vite.config.js            # Vite build configuration
├── index.html                # HTML entry point
├── node_modules/             # Installed dependencies
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Main application component
    ├── App.css               # Component styles
    ├── index.css             # Global styles
    ├── components/
    │   ├── Toolbar.jsx       # Top toolbar with save/preview
    │   ├── ComponentLibrary.jsx # Draggable component list
    │   ├── Canvas.jsx        # Main editor canvas
    │   ├── ComponentRenderer.jsx # Component renderer
    │   ├── Resizer.jsx       # Resize handles
    │   └── PropertyPanel.jsx # Properties editor
    ├── hooks/
    │   └── useAbsolutify.js  # Layout preservation hook
    └── lib/
        └── componentDefinitions.js # Component library definitions
```

### Frontend Files Detail

#### `index.html`
- HTML skeleton
- Root div for React mount
- Scripts to load main.jsx

#### `main.jsx`
- React entry point
- ReactDOM.createRoot setup
- App component mount

#### `App.jsx`
Main application component:
- Project management (create, list, switch)
- Template management (create, list, switch)
- Canvas orchestration
- Save/preview workflow
- Modal dialogs for project/template creation

State managed:
- projects: array of projects
- currentProject: active project
- currentTemplate: active template
- components: template components
- selectedComponent: currently editing component
- showModal: dialog state
- isSaving: save status

#### `components/Toolbar.jsx`
Top navigation bar:
- Project and template name display
- New Project button
- Preview button
- Save button (with loading state)

#### `components/ComponentLibrary.jsx`
Left sidebar:
- Lists all component types from COMPONENT_LIBRARY
- Drag source for components
- Icons from lucide-react
- Scrollable list

#### `components/Canvas.jsx`
Main editor area:
- Drop zone for components
- Renders ComponentRenderer for each component
- Component selection handling
- Delete functionality
- Integrates Resizer for selected components
- Empty state message

#### `components/ComponentRenderer.jsx`
Renders components based on type:
- Hero: gradient section with content
- Text: styled paragraph
- Image: img tag with fallback
- Card: card with image and text
- Button: anchor styled as button
- CardGrid: CSS grid preview

#### `components/Resizer.jsx`
Resize handles for selected component:
- Bottom-right corner handle
- Right edge handle
- Bottom edge handle
- Mouse drag events
- Size constraints (min 100x50px)

#### `components/PropertyPanel.jsx`
Right sidebar when component selected:
- Component type and ID
- Size and position inputs
- Component-specific property inputs
- Color picker for color fields
- Number inputs for numeric fields
- Mark as editable checkbox (creates CMS region)
- Mark as repeating checkbox (creates repeater)
- Display CMS region information
- Close button

#### `hooks/useAbsolutify.js`
Custom hook for layout preservation:
- `absolutify()` - Capture DOM positions
- `relativize()` - Convert to responsive units

#### `lib/componentDefinitions.js`
Component library definitions:
```javascript
COMPONENT_LIBRARY = {
  hero: { type, label, icon, defaultProps, editableFields },
  textBlock: { ... },
  imageBlock: { ... },
  card: { ... },
  cardGrid: { ... },
  button: { ... }
}
```

#### `App.css`
Component-specific styles:
- .hero - hero section styling
- .hero-bg - hero background image
- .card - card styling with hover
- .card-image - card image
- .btn - button styling
- .card-grid - grid layout
- .repeater-item - repeater item styling
- Cursor styles for resize handles

#### `index.css`
Global styles:
- Tailwind imports (ready for configuration)
- HTML/body height 100%
- Font family setup
- Box sizing
- Smoothing

---

## Generated Files

```
server/templates/
├── homepage.njk               # Generated template
├── about-us.njk              # Generated template
└── contact-form.njk          # Generated template
```

Example content:
```nunjucks
{# Generated template: Homepage #}
{% extends "layouts/base.njk" %}

{% block content %}
<div class="template-homepage">
  <!-- Auto-generated from visual builder -->
</div>
{% endblock %}
```

---

## Dependencies

### Backend (package.json)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "fs-extra": "^11.1.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-rnd": "^10.4.1",
    "lucide-react": "^0.263.1",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  }
}
```

---

## Port Configuration

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5174
- **API Proxy**: Frontend proxy `/api` to backend

---

## Key Files to Know

### To Understand the System
1. Read: `QUICKSTART.md` (5 min)
2. Read: `ARCHITECTURE.md` (15 min)
3. Read: `frontend/src/App.jsx` (understand state management)
4. Read: `server/services/templateGenerator.js` (understand generation)

### To Add Features
1. Backend: Edit `server/api/*.js` for new endpoints
2. Frontend: Edit `frontend/src/components/*.jsx` for UI
3. Components: Edit `frontend/src/lib/componentDefinitions.js` to add types
4. Generation: Edit `server/services/templateGenerator.js` for output

### To Debug
1. Backend logs: Terminal running `npm run dev`
2. Frontend logs: Browser console (F12)
3. Database: `builder/server/db/projects.json`
4. Generated files: `server/templates/`

---

## File Naming Conventions

### React Components
- PascalCase: `ComponentLibrary.jsx`, `Toolbar.jsx`
- One component per file
- Exports default component

### Utilities/Hooks
- camelCase: `useAbsolutify.js`
- Named export for hook: `export function useAbsolutify()`

### Styles
- Component: `App.css` for App.jsx
- Global: `index.css`
- Tailwind utility classes preferred

### Backend Routes
- camelCase filenames: `projects.js`, `components.js`
- Named export for router: `export default router`

### Services
- camelCase: `templateGenerator.js`, `fileWriter.js`
- Named exports for functions

---

## Development Workflow

1. **Edit Component** → `frontend/src/components/*.jsx`
2. **Auto-reload**: Vite hot module replacement (automatic)
3. **Edit Backend** → `server/api/*.js` or `services/*.js`
4. **Auto-reload**: nodemon restarts server (automatic)
5. **Test**: Browser at localhost:5174 or API via curl

---

## Checklist for New Developers

- [ ] Read QUICKSTART.md
- [ ] Install dependencies (`npm install`)
- [ ] Run both servers (`npm run dev`)
- [ ] Open http://localhost:5174
- [ ] Create a project and template
- [ ] Add components to canvas
- [ ] Save template and check generated file
- [ ] Read ARCHITECTURE.md
- [ ] Explore the code files

---

## Common Tasks

### Add a New Component Type

1. Edit `frontend/src/lib/componentDefinitions.js`
   - Add to COMPONENT_LIBRARY
   - Define defaultProps and editableFields

2. Edit `server/api/components.js`
   - Add definition to COMPONENT_LIBRARY

3. Edit `frontend/src/components/ComponentRenderer.jsx`
   - Add rendering logic in switch statement

4. Edit `server/services/templateGenerator.js`
   - Add generation logic in generateComponentContent()

### Change Backend Port

1. Edit `builder/server/.env`
   - Change `BUILDER_PORT=4000` to desired port

2. Edit `builder/frontend/vite.config.js`
   - Update proxy target: `/api': 'http://localhost:NEWPORT'`

### Change Frontend Port

1. Edit `builder/frontend/vite.config.js`
   - Change `port: 5174` to desired port

### Add API Endpoint

1. Create new file in `server/api/` if needed
2. Import in `server/index.js`
3. Register route: `app.use('/api/newroute', newRouteHandler)`
4. Frontend: Call via `axios.get('/api/newroute')`

---

## Important Notes

- ⚠️ Don't delete `builder/server/db/projects.json` (contains all data)
- ⚠️ node_modules are large; .gitignore prevents committing
- ✅ Generated .njk files are safe to version control
- ✅ Add .env file to .gitignore before pushing to git
- ✅ Both servers can run simultaneously in different terminals

---

**Generated for WebWolf Template Builder**
**Last Updated: 2026-02-04**
