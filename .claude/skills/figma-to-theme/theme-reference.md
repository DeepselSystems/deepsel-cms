# Interlinked Theme — Complete File Reference

This document contains the complete source code of the `interlinked` theme, the base template for all new themes.

## File Tree

```
themes/interlinked/
├── Index.astro              # Page entry point
├── Blog.astro               # BlogList entry point
├── single-blog.astro        # BlogPost entry point
├── 404.astro                # 404 entry point
├── components/
│   ├── Page.tsx             # Page layout + ContentRenderer
│   ├── BlogList.tsx         # Blog listing with pagination
│   ├── BlogPost.tsx         # Single blog post display
│   ├── Menu.tsx             # Recursive top navigation
│   ├── Sidebar.tsx          # Collapsible sidebar nav
│   ├── Footer.tsx           # Footer component
│   └── LangSwitcher.tsx     # Language dropdown
├── assets/images/hero.jpg   # Default hero image
├── main.css                 # Tailwind + CSS variables
├── tailwind.config.js       # Tailwind config
├── postcss.config.js        # PostCSS config
├── tsconfig.json            # TypeScript config
├── env.d.ts                 # Image module declarations
└── package.json             # Theme dependencies
```

## Data Types (from @deepsel/cms-utils)

### PageData
```typescript
interface PageData {
  id?: number;
  title?: string;
  slug?: string;
  lang?: string;
  content?: {
    main: { 'ds-label': string; 'ds-type': string; 'ds-value': string; }
  };
  seo_metadata?: {
    title: string;
    description: string | null;
    featured_image_id: number | null;
    featured_image_name: string | null;
    allow_indexing: boolean;
  };
  language_alternatives?: LanguageAlternative[];
  public_settings: SiteSettings;
  notFound?: boolean;
}
```

### BlogListData
```typescript
interface BlogListData {
  lang: string;
  public_settings: SiteSettings;
  blog_posts: BlogPostListItem[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

interface BlogPostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_id?: number;
  featured_image_name?: string;
  publish_date?: string;
  author?: { id: number; display_name?: string; username: string; image?: string; };
  lang: string;
}
```

### BlogPostData
```typescript
interface BlogPostData {
  id?: number;
  title?: string;
  content?: string;  // HTML
  lang?: string;
  public_settings: SiteSettings;
  seo_metadata?: SeoMetadata;
  featured_image_id?: number | null;
  featured_image_name?: string | null;
  publish_date?: string | null;
  author?: BlogPostAuthor | null;
  language_alternatives?: LanguageAlternative[];
  notFound?: boolean;
}
```

### MenuItem
```typescript
interface MenuItem {
  id: number;
  position: number;
  title: string;
  url: string | null;
  open_in_new_tab: boolean;
  children: MenuItem[];  // Recursive
}
```

## Available Hooks & Components

### From @deepsel/cms-react
- `WebsiteDataProvider` — Context wrapper, REQUIRED for all page components
- `useWebsiteData()` — Access `{ websiteData, setWebsiteData }`
- `ContentRenderer` — Renders WYSIWYG content from page data
- `useLanguage()` — Returns `{ language, setLanguage, availableLanguages }`
- `PageTransition` — Client-side navigation handler (auto-included by WebsiteDataProvider)

### From @deepsel/cms-utils
- `WebsiteDataTypes` — `{ Page, BlogList, BlogPost }`
- `isActiveMenu(item, websiteData)` — Check if menu item is active
- Type exports: `PageData`, `BlogListData`, `BlogPostData`, `MenuItem`

## Tailwind Color System

Colors are defined as CSS variables in `main.css` and consumed via `tailwind.config.js`:
- Use `primary-50` through `primary-900` in Tailwind classes
- To change theme colors, only update CSS variables in `main.css`

## Key Patterns

### Image Serving
```tsx
// Dynamic images from CMS
<img src={`/api/v1/attachment/serve/${filename}`} />

// Static images from theme assets
import hero from '../assets/images/hero.jpg';
<div style={{ backgroundImage: `url(${hero.src})` }} />
```

### Blog Post Links
```tsx
<a href={`/blog${post.slug}`}>{post.title}</a>
```

### Pagination (Mantine)
```tsx
import { Pagination, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

<MantineProvider>
  <Pagination total={data.total_pages} onChange={(page) => {
    window.history.pushState(null, '', `/blog/page/${page}`);
  }} />
</MantineProvider>
```
