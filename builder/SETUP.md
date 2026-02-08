# Template Builder Setup Guide

## Installation

### Prerequisites
- Node.js 16+ and npm
- Windows, macOS, or Linux

### Step 1: Backend Installation

```bash
cd builder/server
npm install
```

Create a `.env` file (optional, defaults are fine):
```env
BUILDER_PORT=4000
NODE_ENV=development
```

### Step 2: Frontend Installation

```bash
cd builder/frontend
npm install
```

## Running the Application

### Terminal 1: Start Backend Server

```bash
cd builder/server
npm run dev
```

Expected output:
```
🎨 Template Builder running on http://localhost:4000
```

### Terminal 2: Start Frontend Development Server

```bash
cd builder/frontend
npm run dev
```

Expected output:
```
  VITE v4.3.9  ready in 234 ms

  ➜  Local:   http://localhost:5174/
  ➜  press h to show help
```

## Accessing the Application

Open your browser to **http://localhost:5174**

## First Time Setup

1. **Create a Project**
   - Click "Create First Project"
   - Enter a project name (e.g., "My Website")
   - Click "Create"

2. **Create a Template**
   - In the "Templates" panel on the left, click "+ New Template"
   - Enter a template name (e.g., "Homepage")
   - Click "Create"

3. **Add Components**
   - Drag components from the "Components" library on the left
   - Drop them onto the canvas (center white area)
   - Click on components to select them and see properties

4. **Customize Components**
   - With a component selected, you'll see properties on the right
   - Edit width, height, and component-specific properties
   - Mark as "editable" to make it a CMS region

5. **Save Template**
   - Click the "Save" button in the toolbar
   - Template will be generated as a .njk file
   - Check the output message for the file path

## Verification Checklist

### Backend
- [ ] Backend running on http://localhost:4000
- [ ] `GET http://localhost:4000/health` returns `{"status":"ok",...}`
- [ ] `GET http://localhost:4000/api/projects` returns JSON array

### Frontend
- [ ] Frontend running on http://localhost:5174
- [ ] Page loads without console errors
- [ ] Component library visible on left
- [ ] Canvas visible in center
- [ ] Can create projects and templates

### Integration
- [ ] Can create a new project
- [ ] Can create templates in project
- [ ] Can drag components to canvas
- [ ] Can select components and see properties
- [ ] Can resize components
- [ ] Can mark components as editable
- [ ] Can save templates (generates .njk files)

## API Health Check

```bash
# Check backend is running
curl http://localhost:4000/health

# List projects
curl http://localhost:4000/api/projects

# Get component definitions
curl http://localhost:4000/api/components
```

## Troubleshooting

### Port 4000 Already in Use
```bash
# Change port in builder/server/.env
BUILDER_PORT=4001
```

### Port 5174 Already in Use
Edit `builder/frontend/vite.config.js`:
```javascript
server: {
  port: 5175,  // Change this number
  proxy: {
    '/api': 'http://localhost:4000'
  }
}
```

### CORS Errors
- Ensure backend is running on http://localhost:4000
- Check that frontend proxy is configured correctly in `vite.config.js`

### Components Not Rendering
1. Check browser console for errors
2. Verify component definitions in `builder/frontend/src/lib/componentDefinitions.js`
3. Check backend is returning component data at `/api/components`

### Files Not Saving
1. Verify backend is running
2. Check `builder/server/db/projects.json` exists and is readable
3. Check file permissions on the templates directory

## Next Steps

- Read the [README.md](./README.md) for feature overview
- Review component definitions in `builder/frontend/src/lib/componentDefinitions.js`
- Check generated templates in the server's `templates/` directory
- Customize components by editing `componentDefinitions.js` and the renderer
