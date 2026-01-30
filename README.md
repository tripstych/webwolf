# WebWolf CMS

An SEO-centric Content Management System built with React, Express, and Nunjucks.

## Features

- **SEO-First Design** - Server-side rendering with Nunjucks for optimal SEO
- **Template-Driven Content** - Define content regions using `data-cms-*` attributes in templates
- **React Admin UI** - Modern, responsive admin interface
- **Rich Text Editor** - TipTap-powered WYSIWYG editing
- **Media Library** - Upload and manage images and documents
- **SEO Tools** - Meta tags, Open Graph, redirects, sitemap generation
- **MySQL Database** - Reliable, scalable data storage

## Tech Stack

- **Backend**: Express.js, MySQL, Nunjucks
- **Frontend Admin**: React, Vite, TailwindCSS, TipTap
- **Public Site**: Server-rendered Nunjucks templates

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### Installation

1. Clone and install dependencies:
```bash
cd webwolf
npm install
cd admin && npm install && cd ..
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

3. Create database and run migrations:
```bash
npm run db:migrate
npm run db:seed
```

4. Start development servers:
```bash
npm run dev
```

This starts:
- Express server on `http://localhost:3000`
- React admin on `http://localhost:5173`

### Default Login

- Email: `admin@example.com`
- Password: `admin123`

## Project Structure

```
webwolf/
├── server/                 # Express backend
│   ├── api/               # REST API routes
│   ├── db/                # Database connection & migrations
│   ├── middleware/        # Auth middleware
│   ├── render/            # Public site renderer
│   └── services/          # Template parser, etc.
├── admin/                  # React admin interface
│   └── src/
│       ├── components/    # Reusable components
│       ├── context/       # React context (auth)
│       ├── lib/           # API client
│       └── pages/         # Admin pages
├── templates/              # Nunjucks site templates
│   ├── layouts/           # Base layouts
│   └── pages/             # Page templates
├── uploads/                # Media storage
└── public/                 # Static assets
```

## Defining Content Regions

Use `data-cms-*` attributes in your Nunjucks templates to define editable content regions:

```html
<!-- Text field -->
<h1 data-cms-region="hero_title" 
    data-cms-type="text" 
    data-cms-label="Hero Title">
  {{ content.hero_title }}
</h1>

<!-- Rich text field -->
<div data-cms-region="body" 
     data-cms-type="richtext" 
     data-cms-label="Page Content">
  {{ content.body | safe }}
</div>

<!-- Image field -->
<img data-cms-region="featured_image" 
     data-cms-type="image" 
     data-cms-label="Featured Image"
     src="{{ content.featured_image }}">

<!-- Repeater field -->
<div data-cms-region="features" 
     data-cms-type="repeater" 
     data-cms-label="Features"
     data-cms-fields='[{"name":"title","type":"text","label":"Title"},{"name":"description","type":"textarea","label":"Description"}]'>
  {% for feature in content.features %}
    <h3>{{ feature.title }}</h3>
    <p>{{ feature.description }}</p>
  {% endfor %}
</div>
```

### Supported Field Types

| Type | Description |
|------|-------------|
| `text` | Single line text input |
| `textarea` | Multi-line text input |
| `richtext` | WYSIWYG editor |
| `image` | Image picker with media library |
| `repeater` | Repeatable group of fields |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Pages
- `GET /api/pages` - List pages
- `GET /api/pages/:id` - Get page
- `POST /api/pages` - Create page
- `PUT /api/pages/:id` - Update page
- `DELETE /api/pages/:id` - Delete page

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates/sync` - Sync templates from filesystem

### Media
- `GET /api/media` - List media
- `POST /api/media/upload` - Upload file
- `DELETE /api/media/:id` - Delete file

### SEO
- `GET /api/seo/redirects` - List redirects
- `POST /api/seo/redirects` - Create redirect
- `GET /sitemap.xml` - Generated sitemap
- `GET /robots.txt` - Robots file

## Production Build

```bash
# Build admin
npm run build:admin

# Start production server
NODE_ENV=production npm start
```

In production, the admin UI is served from `/admin` on the Express server.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | `webwolf_cms` |
| `JWT_SECRET` | JWT signing secret | - |
| `SESSION_SECRET` | Session secret | - |

## License

MIT
