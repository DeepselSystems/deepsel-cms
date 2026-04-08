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
├── page.astro           # Page template, renders CMS page from backend data (required)
├── 404.astro            # Not found template (required)
├── index.astro          # Home page (optional)
├── blog.astro           # Blog listing (optional)
├── single-blog.astro    # Individual blog post (optional)
├── search.astro         # Search results (optional)
├── my-page.astro        # Custom page (optional, file name is page slug)
├── components/          # React/Astro components
├── assets/              # CSS, images, fonts
└── main.css             # Global styles (if using Tailwind, etc.)
```

## Step-by-Step: Creating a New Theme

### Step 1: Create Theme Directory and Metadata

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

Every `.astro` template receives a `data` prop with the appropriate type. Write the page layout in HTML/Astro and use React components only where interactivity is needed (e.g., navigation menus with dropdowns). This keeps pages fast by shipping minimal JavaScript.

Here's the basic pattern — the page is HTML, with a React "island" for the interactive header menu:

**MenuIsland.tsx** — A small React wrapper that provides CMS context to the menu:

```tsx
import { WebsiteDataTypes, type PageData } from "@deepsel/cms-utils";
import { WebsiteDataProvider } from "@deepsel/cms-react";
import Menu from "./Menu";

export default function MenuIsland({ pageData }: { pageData: PageData }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.Page, data: pageData }}>
      <Menu />
    </WebsiteDataProvider>
  );
}
```

**page.astro** — The template itself is mostly HTML, with `MenuIsland` as the only React island:

```astro
---
import type { PageData } from "@deepsel/cms-utils";
import MenuIsland from "./components/MenuIsland";
import Footer from "./components/Footer.astro";
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
    <MenuIsland client:load pageData={data} />
    <main>
        <article set:html={data.content} />
    </main>
    <footer><!-- Footer content --></footer>
</body>
</html>
```

Use `client:load` on React components that need interactivity (like menus). Static parts like footers can be plain Astro components or HTML.

#### Why the island wrapper?

Each `client:load` component becomes an **isolated React tree** — there is no shared React context between islands. If `Menu` uses `useWebsiteData()`, it needs a `WebsiteDataProvider` above it in the tree. But the `.astro` file is server-rendered HTML, not a React tree, so it can't provide that context. The island wrapper puts the provider and the component in the same React tree:

```
Astro (static HTML)
  └── MenuIsland (client:load → React island boundary)
        └── WebsiteDataProvider (React context)
              └── Menu (can now call useWebsiteData())
```

Alternatively, a component can set up its own provider internally — no separate wrapper needed. Both approaches work; the wrapper just keeps context plumbing separate from component logic.

### Step 3: Implement Components

#### Content Styles

Templates that render CMS editor content (pages, blog posts) should import the shared content styles from `@deepsel/cms-utils`. These styles handle editor-generated elements like collapsible sections, embedded files/video/audio, code blocks, and more:

```astro
---
import "@deepsel/cms-utils/styles.css";
import "./main.css";
---
```

Import `@deepsel/cms-utils/styles.css` **before** your theme's own CSS so theme styles can override if needed.

### Step 4: Theme Registration (Automatic)

`client/src/themes.ts` and `client/tailwind.config.js` are **fully auto-generated** by the backend — do not edit them manually. The backend scans `themes/` on startup and regenerates these files to import only the currently selected theme.

When a theme is selected via the admin or `/theme/select` API:
- `themes.ts` is regenerated with imports and `themeMap` for just that theme
- `tailwind.config.js` is regenerated with only that theme's Tailwind preset
- In production, the client is rebuilt and restarted automatically
- In dev mode (`NO_CLIENT=true`), files are regenerated locally and Astro HMR picks up changes

**No manual registration step is needed** — just create your theme files and select the theme.

### Step 5: Activate and Test

Select the theme via the admin Themes page, or via the API:

```bash
curl -X POST http://localhost:8000/api/v1/theme/select \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"folder_name": "<theme-name>"}'
```

Then start the dev server if not already running:

```bash
npm install  # from repo root
npm run dev
```

## Special Templates Reference

The CMS recognizes six special template files. Each maps to a URL pattern and receives typed data.

### index.astro — Home Page

**URL:** `/` or `/{lang}/`
**Data type:** `PageData`

Renders the home page. Overrides any CMS-defined home page.

### page.astro — Generic Page

**URL:** `/{slug}` or `/{lang}/{slug}`
**Data type:** `PageData`

Main workhorse template. CMS pages (e.g., `/about`, `/contact`) render through this. `PageData.content` contains rich text from the TipTap editor.

This template is a styling wrapper — it provides site layout (header, footer, sidebar) while actual content comes from the CMS database.

### blog.astro — Blog Listing

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

Custom page contents are **static** — they don't fetch content from the CMS backend. They receive a minimal `PageData` with `slug`, `public_settings`, and an auto-generated `seo_metadata.title` derived from the filename.

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

  - `useLanguage` — Language switching utilities
  - `useAuthentication` — Auth state for preview mode
  - `PageTransition` — Page transition animations

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

Use `post_install` for setup logic that can't be expressed as CSV records, such as:

- Adding languages to the site's available languages list
- Setting the default site language
- Configuring theme-specific CMS settings

### Loading Behavior

- Seed data is loaded by `load_seed_data_for_theme()` in `backend/apps/cms/utils/setup_themes.py`
- Runs **once when a theme is selected** — either via the `/theme/select` API or when `set_default_theme_if_empty()` assigns the initial theme on a fresh DB
- Does **not** run on every server restart — user edits (e.g., deleting a menu item) are preserved across restarts
- CSV records with `string_id` are checked for existence — existing records are updated, not duplicated

CSV format follows the same rules as backend app data — see `backend/docs/DataInsertion.md`.

The Claude skill [data-insertion](.claude/skills/data-insertion/SKILL.md) is also available for AI agents to autonomously generate and manage CSV data.
