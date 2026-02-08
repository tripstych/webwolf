# Template Builder Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
│                   http://5174                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               React Frontend (Vite)                  │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  App.jsx - Main application orchestration   │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌────────────┐ ┌────────┐ ┌──────┐ ┌────────────┐  │  │
│  │  │ Toolbar    │ │Library │ │Canvas│ │Properties │  │  │
│  │  │            │ │        │ │      │ │           │  │  │
│  │  │- Save      │ │- Hero  │ │- D&D │ │- Edit     │  │  │
│  │  │- Preview   │ │- Cards │ │- Zoom│ │- CMS Mark │  │  │
│  │  │- Projects  │ │- Text  │ │- Grid│ │- Resize   │  │  │
│  │  └────────────┘ └────────┘ └──────┘ └────────────┘  │  │
│  │                                                      │  │
│  │  Hooks:                                            │  │
│  │  - useAbsolutify() - Layout preservation          │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                  │
│                    axios HTTP calls                         │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Node.js)                      │
│                   http://4000                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  index.js                            │  │
│  │  - CORS middleware                                  │  │
│  │  - JSON parser                                      │  │
│  │  - Route registration                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │              API Routes                             │   │
│  │                                                    │   │
│  │  /api/projects       - Create/Read/Update/Delete   │   │
│  │  /api/templates      - Template CRUD               │   │
│  │  /api/components     - Component library defs      │   │
│  │  /api/generate       - Nunjucks generation         │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Services (Business Logic)                │   │
│  │                                                    │   │
│  │  templateGenerator.js                             │   │
│  │  - JSON → Nunjucks conversion                      │   │
│  │  - Component HTML generation                      │   │
│  │  - CMS region markup                              │   │
│  │                                                    │   │
│  │  fileWriter.js                                    │   │
│  │  - Write .njk files to disk                        │   │
│  │  - File management utilities                      │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Database Layer                        │   │
│  │                                                    │   │
│  │  db/projects.json                                 │   │
│  │  - Projects and templates storage                 │   │
│  │  - Simple JSON persistence                        │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           ↓
    Generated Files
    - templates/*.njk - Nunjucks template files
    - db/projects.json - Project/template data
```

## Data Flow

### Creating a Template

```
1. User clicks "Create Template"
   ↓
2. Frontend POST to /api/templates
   ↓
3. Backend creates template in projects.json
   ↓
4. Returns template object to frontend
   ↓
5. Frontend loads template and initializes canvas
```

### Adding Components

```
1. User drags component from library
   ↓
2. onDrop handler captures event
   ↓
3. Creates component object with:
   - id: Date.now().toString()
   - type: hero, text, card, etc.
   - props: default properties
   - position: x, y coordinates
   - size: width, height
   ↓
4. Component added to state array
   ↓
5. Canvas re-renders with new component
```

### Saving Template

```
1. User clicks "Save"
   ↓
2. Frontend calls /api/generate/save
   ↓
3. Backend:
   a. Calls templateGenerator.generateNunjucksTemplate()
   b. Generates HTML with CMS regions
   c. Calls fileWriter.writeTemplateFile()
   d. Writes .njk file to disk
   e. Updates template in projects.json
   ↓
4. Returns file path to frontend
   ↓
5. Frontend shows success message
```

## Component Data Model

```javascript
{
  // Identification
  id: "1707049200000",
  type: "hero",

  // Presentation
  props: {
    title: "Welcome",
    subtitle: "To our site",
    backgroundImage: "",
    height: "600px"
  },

  // Layout
  position: {
    x: "10%",
    y: "20px"
  },
  size: {
    width: "100%",
    height: "600px"
  },

  // CMS Integration
  isEditable: true,  // Makes it a CMS region
  isRepeating: false, // Makes it a repeater
  cmsRegion: {
    name: "hero_title",
    type: "text",
    label: "Hero Title"
  },

  // Structure
  children: [] // Nested components
}
```

## Absolutify/Relativize Process

### Phase 1: Normal Design
```
User drags/drops components in normal flow layout
Components use percentage-based or relative sizing
```

### Phase 2: Absolutify
```
Before saving, capture computed positions:
1. For each component, get getBoundingClientRect()
2. Calculate relative to canvas position
3. Store absolute pixel values
4. Temporarily apply position: absolute (in memory)
```

### Phase 3: Capture
```
Store computed values:
{
  _absolutePosition: {
    top: 150,
    left: 50,
    width: 1200,
    height: 600
  }
}
```

### Phase 4: Relativize
```
Convert pixel values to percentage/responsive units:
- width: (1200 / 1200) * 100% = 100%
- left: (50 / 1200) * 100% = 4.17%
- height: 600px (pixel heights are OK)

Result:
{
  position: { x: "4.17%", y: "150px" },
  size: { width: "100%", height: "600px" }
}
```

### Phase 5: Generate
```
Create Nunjucks template with preserved layout:
<div style="width: 100%; height: 600px; margin-left: 4.17%">
  {{ content.hero_title }}
</div>
```

## File Structure

```
builder/
├── server/
│   ├── index.js                    # Express app entry
│   ├── package.json
│   ├── .env.example
│   ├── api/
│   │   ├── projects.js             # Project CRUD
│   │   ├── templates.js            # Template CRUD
│   │   ├── components.js           # Component definitions
│   │   └── generate.js             # Nunjucks generation
│   ├── services/
│   │   ├── templateGenerator.js    # JSON → Nunjucks
│   │   └── fileWriter.js           # File I/O
│   └── db/
│       └── projects.json           # JSON storage
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                # Vite entry
│   │   ├── App.jsx                 # Main component
│   │   ├── App.css                 # Styles
│   │   ├── index.css               # Tailwind imports
│   │   ├── components/
│   │   │   ├── Toolbar.jsx         # Top navigation
│   │   │   ├── ComponentLibrary.jsx # Draggable components
│   │   │   ├── Canvas.jsx          # Main builder canvas
│   │   │   ├── ComponentRenderer.jsx # Component renderer
│   │   │   ├── Resizer.jsx         # Resize handles
│   │   │   └── PropertyPanel.jsx   # Property editor
│   │   ├── hooks/
│   │   │   └── useAbsolutify.js    # Layout preservation
│   │   └── lib/
│   │       └── componentDefinitions.js # Component schemas
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
├── README.md
├── SETUP.md
└── ARCHITECTURE.md (this file)
```

## Component Lifecycle

```
1. LIBRARY DEFINITION
   └─ COMPONENT_LIBRARY[type]
      ├─ label: user-friendly name
      ├─ icon: lucide icon name
      ├─ defaultProps: initial properties
      └─ editableFields: which props can be edited

2. INSTANTIATION
   └─ User drags component from library
   └─ Creates component object with unique ID

3. RENDERING
   └─ ComponentRenderer checks component.type
   └─ Renders appropriate JSX based on type
   └─ Applies props and styles

4. EDITING
   └─ User selects component
   └─ PropertyPanel shows editable properties
   └─ User can modify props and settings

5. CMS MARKING
   └─ User marks as editable/repeating
   └─ cmsRegion object created with:
      ├─ name: variable name in template
      ├─ type: data type (text, image, etc)
      └─ label: friendly name

6. GENERATION
   └─ templateGenerator reads component
   └─ Generates appropriate HTML snippet
   └─ If isEditable: {{ content.region_name }}
   └─ If isRepeating: {% for item in content.items %}

7. PERSISTENCE
   └─ fileWriter saves .njk file
   └─ projects.json updated with metadata
```

## Key Technologies

### Backend
- **Express.js** - HTTP server and routing
- **fs-extra** - File system utilities
- **CORS** - Cross-origin requests
- **dotenv** - Environment configuration

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility CSS (ready, not yet configured)
- **lucide-react** - Icon library
- **axios** - HTTP client
- **react-beautiful-dnd** - Drag and drop (deprecated but functional)

## API Design Principles

1. **RESTful Routes** - Standard HTTP verbs (GET, POST, PUT, DELETE)
2. **Project-Based Organization** - Templates belong to projects
3. **JSON Serialization** - Projects and templates stored as JSON
4. **Separation of Concerns** - API, services, database layers separate
5. **Error Handling** - Status codes and error messages in responses

## Performance Considerations

1. **Lazy Loading** - Templates only loaded when selected
2. **Debouncing** - Auto-save could be implemented
3. **Component Memoization** - Prevent unnecessary re-renders
4. **Virtual Scrolling** - For large component libraries (future)
5. **Template Caching** - Cache generated Nunjucks output

## Security Considerations

1. **Input Validation** - Sanitize component names and properties
2. **File Path Validation** - Prevent directory traversal in file writing
3. **Project Isolation** - Each project has own templates
4. **CORS Configuration** - Restrict to trusted origins
5. **SQL Injection** - Not applicable (JSON storage), but important for database upgrade

## Future Architecture Improvements

1. **Database Migration** - Move from JSON to PostgreSQL/MySQL
2. **Real-time Collaboration** - WebSocket support
3. **Version Control** - Git-like template versioning
4. **Component Registry** - Publish/share custom components
5. **Plugin System** - Extend functionality
6. **Microservices** - Separate generation and file management
