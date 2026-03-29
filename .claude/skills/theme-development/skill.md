---
name: theme-development
description: Create or modify a theme. Use when asked to create a new theme, add theme pages/components, modify theme templates, or get guidance on theme structure. Does NOT require Figma - for Figma-based themes use figma-to-theme instead.
argument-hint: <theme-name>
---

# Theme Development

Create or modify Astro-based CMS themes. This skill covers theme structure, templates, components, custom pages, and multi-language support.

## Arguments

- `$0` — Theme name in snake_case (e.g., `my_theme`, `starter_react`)

If no argument provided, ask the user what theme they want to create or modify.

## When to Use

- User wants to create a new theme from scratch (no Figma)
- User wants to add a page, component, or template to an existing theme
- User asks about theme structure, data types, or conventions
- User wants to understand how themes work

For Figma-based theme creation, use `/figma-to-theme` instead.

## Overview

Themes are Astro-based template packages that control how the public website renders. Each theme lives in `themes/{theme_name}/` and is automatically discovered and registered by the CMS.

Astro is framework-agnostic — theme developers can use React, Vue, Svelte, Angular, Solid, or plain HTML/CSS/JS. `.astro` files handle the page shell (HTML document, head, meta tags), while interactive components use any framework via Astro's integration system. Components hydrate on the client via directives like `client:load`.

## Theme Structure

```
themes/{theme_name}/
├── theme.json           # Metadata: name, description, preview image
├── package.json         # Dependencies (React, UI libs, etc.)
├── Index.astro          # Home page template
├── page.astro           # Generic page template (renders CMS pages)
├── Blog.astro           # Blog listing page
├── single-blog.astro    # Individual blog post
├── search.astro         # Search results page
├── 404.astro            # Not found page
├── my-page.astro        # Custom page (optional, any name)
├── components/          # React/Astro components
├── assets/              # CSS, images, fonts
└── main.css             # Global styles (if using Tailwind, etc.)
```

## Step-by-Step: Creating a New Theme

### Step 1: Scaffold from Existing Theme

Copy an existing theme as a starting point:

```bash
cp -r themes/interlinked themes/<theme-name>
```

Then update these files:

#### theme.json

```json
{
  "name": "My Theme",
  "description": "A brief description of the theme.",
  "image": "preview.jpg"
}
```

The `image` field points to a preview screenshot shown in the admin dashboard.

#### package.json

Shared dependencies (`react`, `react-dom`) go in `peerDependencies`. Theme-specific dependencies go in `dependencies`.

```json
{
  "name": "@themes/<theme-name>",
  "version": "0.0.1",
  "type": "module",
  "peerDependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "dependencies": {
    "@deepsel/cms-react": "^2.0.3",
    "@deepsel/cms-utils": "^1.1.5"
  }
}
```

Always run `npm install` from the repo root to ensure proper hoisting.

### Step 2: Create Template Files

Every `.astro` template receives a `data` prop with the appropriate type. Basic pattern:

```astro
---
import type { PageData } from "@deepsel/cms-utils";
import Page from "./components/Page";
import "@deepsel/cms-utils/styles.css";
import "./main.css";

interface Props {
    data: PageData;
}

const { data } = Astro.props;
---

<!DOCTYPE html>
<html lang={data.lang || 'en'}>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{data.seo_metadata?.title || ''}</title>
    <meta name="description" content={data.seo_metadata?.description || ''} />
    <meta name="robots" content={data.seo_metadata?.allow_indexing ? 'index, follow' : 'noindex, nofollow'} />
</head>
<body>
    <Page client:load pageData={data} />
</body>
</html>
```

Interactive React components must use `client:load` to hydrate on the client side.

### Step 3: Implement Components

#### Rendering CMS Content

For `page.astro` and `Index.astro`, the page content from the admin editor is in `data.content`. Use `ContentRenderer` from `@deepsel/cms-react`:

```tsx
import { WebsiteDataProvider, ContentRenderer } from "@deepsel/cms-react";
import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";

export default function Page({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider
      websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}
    >
      <header>{/* Navigation, logo, etc. */}</header>
      <main>
        <ContentRenderer />
      </main>
      <footer>{/* Footer content */}</footer>
    </WebsiteDataProvider>
  );
}
```

`WebsiteDataProvider` makes page data available to all child components via `useWebsiteData()`.

#### Import Rules

```tsx
import { WebsiteDataTypes, type PageData, type BlogListData, type BlogPostData } from "@deepsel/cms-utils";
import { isActiveMenu, type MenuItem } from "@deepsel/cms-utils";
import { WebsiteDataProvider, ContentRenderer, useWebsiteData } from "@deepsel/cms-react";
import { useLanguage } from "@deepsel/cms-react";
```

```astro
// In .astro files that render CMS content (page, single-blog, Index):
import "@deepsel/cms-utils/styles.css";
```

### Step 4: Register the Theme

The backend's `setup_themes()` auto-registers themes, but during development you may need to manually update `client/src/themes.ts` between the auto-managed comment markers:

```typescript
'<theme-name>': {
  [themeSystemKeys.Page]: ThemeIndex,
  [themeSystemKeys.BlogList]: ThemeBlog,
  [themeSystemKeys.BlogPost]: ThemeSingleBlog,
  [themeSystemKeys.NotFound]: Theme404,
  'about': ThemeAbout,        // Custom page
  'services': ThemeServices,  // Custom page
},
```

### Step 5: Activate and Test

```bash
# Activate theme in DB
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "UPDATE organization SET selected_theme = '<theme-name>' WHERE id = (SELECT id FROM organization LIMIT 1);"

# Install dependencies and build
npm install
npm run build

# Start dev server
npm run dev
```

## Special Templates Reference

The CMS recognizes six special template files. Each maps to a URL pattern and receives typed data.

### Index.astro — Home Page

**URL:** `/` or `/{lang}/`
**Data type:** `PageData`

Renders the home page. Falls back to `page.astro` if not present.

### page.astro — Generic Page

**URL:** `/{slug}` or `/{lang}/{slug}`
**Data type:** `PageData`

Main workhorse template. CMS pages (e.g., `/about`, `/contact`) render through this. `PageData.content` contains rich text from the TipTap editor — render with `<ContentRenderer />`.

This template is a styling wrapper — it provides site layout (header, footer, sidebar) while actual content comes from the CMS database.

### Blog.astro — Blog Listing

**URL:** `/blog`, `/blog/page/{n}` or `/{lang}/blog`
**Data type:** `BlogListData`

Receives a paginated list of blog posts. `BlogListData` includes `blog_posts`, `page`, `page_size`, `total_count`, `total_pages`.

### single-blog.astro — Blog Post

**URL:** `/blog/{slug}` or `/{lang}/blog/{slug}`
**Data type:** `BlogPostData`

Individual blog post. `BlogPostData` includes `title`, `content` (HTML string), `author`, `featured_image_id`, `publish_date`, and more.

### search.astro — Search Results

**URL:** `/search?q={query}` or `/{lang}/search?q={query}`
**Data type:** `SearchResultsData`

`SearchResultsData` includes `query`, `results` (array of `SearchResultItem`), `total`, `suggestions`.

### 404.astro — Not Found

**Data type:** `PageData` (with `notFound: true`)

The `PageData` still includes `public_settings` for site-wide config access.

## Custom Pages

Any `.astro` file that isn't a special template becomes a **custom page** with its own URL route. Filename (without `.astro`) becomes the URL path.

| File                    | URL                              |
|-------------------------|----------------------------------|
| `contact.astro`         | `/contact` or `/{lang}/contact`  |
| `pricing.astro`         | `/pricing` or `/{lang}/pricing`  |
| `my-custom-page.astro`  | `/my-custom-page`                |

Custom pages are **client-only** — they don't fetch from the CMS backend. They receive minimal `PageData` with `slug`, `public_settings`, and auto-generated `seo_metadata.title` from the filename.

Useful for pages with fully custom layouts that don't need the CMS editor (landing pages, contact forms, etc.).

## Language Variants

Language-specific template variants are stored in `themes/{lang_code}/{theme_name}/`:

```
themes/
├── my_theme/              # Default templates
│   ├── page.astro
│   ├── contact.astro
│   └── ...
└── de/
    └── my_theme/          # German variants
        ├── page.astro
        └── contact.astro
```

When visiting `/{lang}/...`, the CMS tries the language variant first, then falls back to the default. E.g., `/de/contact` → `themes/de/my_theme/contact.astro` if exists, else `themes/my_theme/contact.astro`.

Language variants are typically managed through the admin's theme file editor.

## Available Data Types

### PageData

```typescript
interface PageData {
  id?: number;
  title?: string;
  content?: Content;              // TipTap editor content
  slug?: string;
  lang?: string;
  public_settings: SiteSettings;  // Site-wide settings
  seo_metadata?: SeoMetadata;     // title, description, allow_indexing, featured_image
  language_alternatives?: LanguageAlternative[];
  page_custom_code?: string;      // Custom HTML/JS injected per-page
  custom_code?: string;           // Global custom code
  require_login?: boolean;
  notFound?: boolean;
}
```

### BlogListData

```typescript
interface BlogListData {
  lang: string;
  public_settings: SiteSettings;
  blog_posts: BlogPostListItem[];  // id, title, slug, excerpt, featured_image, publish_date, author
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}
```

### BlogPostData

```typescript
interface BlogPostData {
  id?: number;
  title?: string;
  content?: string;               // HTML content
  lang?: string;
  public_settings: SiteSettings;
  seo_metadata?: SeoMetadata;
  featured_image_id?: number;
  featured_image_name?: string;
  publish_date?: string;
  author?: BlogPostAuthor;        // id, username, display_name, image
  language_alternatives?: LanguageAlternative[];
  notFound?: boolean;
}
```

### SearchResultsData

```typescript
interface SearchResultsData {
  lang: string;
  query: string;
  public_settings: SiteSettings;
  results: SearchResultItem[];    // id, title, url, publishDate, contentType, relevanceScore
  total: number;
  suggestions: string[];
}
```

## Key Packages

- **`@deepsel/cms-utils`** — Data types (`PageData`, `BlogListData`, etc.) and fetch utilities
- **`@deepsel/cms-react`** — React components and hooks:
  - `WebsiteDataProvider` / `useWebsiteData()` — Context for page data
  - `ContentRenderer` — Renders TipTap HTML content from the CMS editor
  - `useLanguage` — Language switching utilities
  - `useAuthentication` — Auth state for preview mode
  - `PageTransition` — Page transition animations

## Auto-Registration

The backend's `setup_themes()` process:

1. Discovers all `.astro` files in your theme folder
2. Generates import statements and theme map in `client/src/themes.ts`
3. Maps special filenames to system keys (`Index.astro` → `index`, `page.astro` → `page`, etc.)
4. Maps other `.astro` files as custom page keys (e.g., `contact.astro` → `contact`)
5. Discovers language variant folders and registers them with `{lang}:{key}` prefixes

This runs automatically when the backend starts.

## Theme Seed Data

Themes can include a `data/` directory with CSV seed files and a `post_install` hook:

```
themes/{theme_name}/data/
├── __init__.py      # import_order list + optional post_install(db)
└── menu.csv         # CSV files (same format as backend app data)
```

`__init__.py` defines `import_order` and optionally `post_install(db)`:

```python
import_order = ["menu.csv"]

def post_install(db):
    """Runs after CSV import. Receives a SQLAlchemy session."""
    from apps.core.models.locale import LocaleModel
    from apps.cms.models.organization import CMSSettingsModel

    locale = db.query(LocaleModel).filter(LocaleModel.string_id == "de_DE").first()
    if locale:
        for org in db.query(CMSSettingsModel).all():
            available = org.available_languages or []
            if not any(l.get("iso_code") == "de" for l in available):
                available.append({"id": locale.id, "name": locale.name, "iso_code": locale.iso_code})
                org.available_languages = available
            org.default_language_id = locale.id
        db.commit()
```

Use `post_install` for setup logic that can't be expressed as CSV records (e.g., language defaults, CMS settings). The hook runs once when the theme is selected, not on every server restart.

CSV format follows the same rules as backend app data — see `backend/docs/DataInsertion.md`.

## Reserved Filenames

These are reserved for special templates:

- `Index.astro` (or `index.astro`)
- `page.astro`
- `Blog.astro` (or `blog.astro`)
- `single-blog.astro`
- `search.astro`
- `404.astro`

The path `blog/*` is reserved for blog routing — avoid custom pages that conflict with it.
