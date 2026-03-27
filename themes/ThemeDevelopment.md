# Theme Development Guide

Themes are Astro-based template packages that control how the public website renders. Each theme lives in `themes/{theme_name}/` and is automatically discovered and registered by the CMS.

Astro is a framework-agnostic static site builder. Theme developers can use any UI framework — React, Vue, Svelte, Angular, Solid, or plain HTML/CSS/JS. Astro's `.astro` files handle the page shell (HTML document, head, meta tags), while interactive components can be written in your framework of choice using [Astro's integration system](https://docs.astro.build/en/guides/integrations-guide/). Components hydrate on the client via directives like `client:load`, keeping pages fast by default and only shipping JavaScript where interactivity is needed.

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

## theme.json

```json
{
  "name": "My Theme",
  "description": "A brief description of the theme.",
  "image": "preview.jpg"
}
```

The `image` field points to a screenshot or preview of the theme. This image is displayed to users in the admin dashboard when selecting a theme for their site.

## package.json

Shared dependencies like `react` and `react-dom` should be declared as `peerDependencies` — they resolve from the root workspace. Theme-specific dependencies go in `dependencies`.

```json
{
  "name": "@themes/my_theme",
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

## Special Templates

The CMS recognizes six special template files. Each maps to a specific URL pattern and receives typed data as a `data` prop.

### Index.astro — Home Page

**URL:** `/` (or `/{lang}/`)
**Data type:** `PageData`

Renders the home page. Falls back to `page.astro` if not present.

### page.astro — Generic Page Template

**URL:** `/{slug}` (or `/{lang}/{slug}`)
**Data type:** `PageData`

This is the main workhorse template. When a user creates a page in the admin (e.g., `/about`, `/contact`), the CMS fetches the page content from the backend and renders it through this template. The `PageData.content` field contains the rich text content from the TipTap editor, which you render using `<ContentRenderer />` from `@deepsel/cms-react`.

This template acts as a styling wrapper — it provides the site's layout (header, footer, sidebar, etc.) while the actual page content comes from the CMS database.

### Blog.astro — Blog Listing

**URL:** `/blog`, `/blog/page/{n}` (or `/{lang}/blog`)
**Data type:** `BlogListData`

Receives a paginated list of blog posts. `BlogListData` includes `blog_posts`, `page`, `page_size`, `total_count`, and `total_pages`.

### single-blog.astro — Blog Post

**URL:** `/blog/{slug}` (or `/{lang}/blog/{slug}`)
**Data type:** `BlogPostData`

Renders an individual blog post. `BlogPostData` includes `title`, `content` (HTML string), `author`, `featured_image_id`, `publish_date`, and more.

### search.astro — Search Results

**URL:** `/search?q={query}` (or `/{lang}/search?q={query}`)
**Data type:** `SearchResultsData`

Renders search results. `SearchResultsData` includes `query`, `results` (array of `SearchResultItem`), `total`, and `suggestions`.

### 404.astro — Not Found

**Data type:** `PageData` (with `notFound: true`)

Rendered when a requested page doesn't exist. The `PageData` still includes `public_settings` for accessing site-wide configuration.

## Writing a Template

Every `.astro` template receives a `data` prop with the appropriate type. Here's the basic pattern:

```astro
---
import type { PageData } from "@deepsel/cms-utils";
import Page from "./components/Page";
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

## Rendering CMS Content

For `page.astro` and `Index.astro`, the page content created in the admin editor is available in `data.content`. Use the `ContentRenderer` component from `@deepsel/cms-react` to render it:

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

`WebsiteDataProvider` makes the page data available to all child components via the `useWebsiteData()` hook.

## Custom Pages

Any `.astro` file in your theme folder that isn't a special template becomes a **custom page** with its own URL route. The filename (without `.astro`) becomes the URL path.

| File                    | URL                              |
|-------------------------|----------------------------------|
| `contact.astro`         | `/contact` or `/{lang}/contact`  |
| `pricing.astro`         | `/pricing` or `/{lang}/pricing`  |
| `my-custom-page.astro`  | `/my-custom-page`                |

Custom pages are **client-only** — they don't fetch content from the CMS backend. They receive a minimal `PageData` with `slug`, `public_settings`, and an auto-generated `seo_metadata.title` derived from the filename.

This is useful for pages with fully custom layouts that don't need the CMS editor, like landing pages, contact forms, or specialized service pages.

Custom pages are written exactly like special templates:

```astro
---
import type { PageData } from "@deepsel/cms-utils";
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
    <title>Contact Us</title>
</head>
<body>
    <!-- Your fully custom layout here -->
</body>
</html>
```

## Language Variants

The CMS supports multi-language sites. Any template (special or custom) can have a language-specific variant.

Language variants are stored in `themes/{lang_code}/{theme_name}/`:

```
themes/
├── my_theme/              # Default templates
│   ├── page.astro
│   ├── contact.astro
│   └── ...
└── de/
    └── my_theme/          # German variants
        ├── page.astro     # German page template
        └── contact.astro  # German contact page
```

When a user visits `/{lang}/...`, the CMS tries the language-specific variant first, then falls back to the default. For example, visiting `/de/contact` will use `themes/de/my_theme/contact.astro` if it exists, otherwise `themes/my_theme/contact.astro`.

Language variants are typically managed through the admin's theme file editor, which stores content in the database and writes the files to disk during theme setup.

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
- **`@deepsel/cms-react`** — React components and hooks for themes:
  - `WebsiteDataProvider` / `useWebsiteData()` — Context for page data
  - `ContentRenderer` — Renders TipTap HTML content from the CMS editor
  - `useLanguage` — Language switching utilities
  - `useAuthentication` — Auth state for preview mode
  - `PageTransition` — Page transition animations

## Auto-Registration

You don't need to manually register your theme. The backend's `setup_themes()` process:

1. Discovers all `.astro` files in your theme folder
2. Generates import statements and a theme map in `client/src/themes.ts`
3. Maps special filenames to system keys (`Index.astro` → `index`, `page.astro` → `page`, etc.)
4. Maps any other `.astro` files as custom page keys (e.g., `contact.astro` → `contact`)
5. Discovers language variant folders and registers them with `{lang}:{key}` prefixes

This runs automatically when the backend starts. During development, saving a theme file through the admin triggers a rebuild.

## Reserved Filenames

These filenames are reserved for special templates and cannot be used as custom page names:

- `Index.astro` (or `index.astro`)
- `page.astro`
- `Blog.astro` (or `blog.astro`)
- `single-blog.astro`
- `search.astro`
- `404.astro`

Additionally, the path `blog/*` is reserved for blog routing, so avoid custom pages that would conflict with it.
