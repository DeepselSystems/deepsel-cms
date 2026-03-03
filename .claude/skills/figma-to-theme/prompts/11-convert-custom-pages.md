# Phase 4h: Convert Custom Page Components

## Goal
Create dedicated components for each distinct page found in the Figma design. The number and type of pages is entirely driven by the design — there are no predetermined pages.

## Input
- `$MIGRATION_DIR/design-map.md` — the complete list of pages discovered in Phase 2
- `$MIGRATION_DIR/vibe-output/<page-slug>/` — vibe_figma generated code for each page (pixel-accurate reference)
- `$MIGRATION_DIR/screenshots/` — visual reference for each page
- `themes/<name>/assets/images/` — all assets

**For each custom page, read its vibe_figma output FIRST.** The generated code has pixel-accurate sections. Adapt them into CMS components by adding WebsiteDataProvider, dynamic data, and proper imports.

## Process

### Step 1: Review the design map
Read `$MIGRATION_DIR/design-map.md` and identify all pages that need custom components. A page needs a custom component if it has unique visual sections not handled by the generic `ContentRenderer`.

### Step 2: For each custom page

**Create the component file: `components/Page<Name>.tsx`**

```tsx
import { useWebsiteData } from '@deepsel/cms-react';

export default function Page<Name>() {
  const { websiteData } = useWebsiteData();

  return (
    <>
      {/* Sections specific to this page, extracted from Figma */}
      <HeroSection />
      <FeaturesSection />
      {/* etc. — whatever sections the design shows for this page */}
    </>
  );
}

// Inline section components (or import from shared if reused)
function HeroSection() {
  return (
    <section className="...">
      {/* Match Figma exactly */}
    </section>
  );
}
```

**Create the Astro entry point: `<slug>.astro`**

```astro
---
import type { PageData } from "@deepsel/cms-utils";
import Page<Name> from "./components/Page<Name>";
import "./main.css";

interface Props { data: PageData; }
const { data } = Astro.props;
---

<!doctype html>
<html lang={data.lang || "en"}>
  <head>
    <meta charset="utf-8" />
    <title>{data.seo_metadata?.title || ""}</title>
    <meta name="description" content={data.seo_metadata?.description || ""} />
    <meta name="robots" content={data.seo_metadata?.allow_indexing ? "index, follow" : "noindex, nofollow"} />
    <!-- Same Google Fonts as other .astro files -->
  </head>
  <body>
    <Page<Name> client:load pageData={data} />
  </body>
</html>
```

**Note:** The `.astro` filename must match the CMS page slug exactly. For example, if a CMS page has slug `/about`, create `about.astro`. The routing system (`getThemeComponent.ts`) maps `themeMap[theme][slug]` automatically via `theme_imports.py`.

### Step 3: Wire up in Page.tsx
Also add the component to the `pageComponents` map in `Page.tsx` as a fallback:
```tsx
const pageComponents: Record<string, React.FC> = {
  '<slug>': Page<Name>,
  // ... other pages from design
};
```

## Custom Page Component Rules

1. **Every custom page component wraps content in the same layout as Page.tsx** — same header, menu, footer structure. The page component itself handles only the `<main>` content area. OR, if it has its own `.astro` file, it can be a full-page component (with its own WebsiteDataProvider, header, footer).

2. **Content is hardcoded from Figma** — text, images, section structure all come from the design. The CMS `ContentRenderer` is NOT used on custom pages (it's only for the generic fallback).

3. **Keep components self-contained** — each page component should be understandable on its own without needing to trace through many imports.

4. **Extract shared sections** — if two pages share the same section (e.g., both have a CTA block), extract it to a shared component.

## Deciding Component Structure

The page component can be structured two ways:

**Option A: Lightweight page content (used inside Page.tsx layout)**
- Page component only renders the `<main>` content
- Header/Menu/Footer come from the parent Page.tsx wrapper
- The `.astro` file imports `Page.tsx` and passes data — Page.tsx dispatches to this component by slug

**Option B: Full standalone page (own .astro file)**
- Page component includes WebsiteDataProvider, header, menu, footer
- The `.astro` file imports this component directly
- Better when the page layout differs significantly from the generic layout (e.g., no sidebar, different header style)

Choose based on how different the page is from the generic layout:
- Same header/footer/layout → Option A
- Different layout → Option B

## Checklist
- [ ] Every page from design-map.md has a component
- [ ] Every custom page has a matching `.astro` file with the correct slug filename
- [ ] Page sections match Figma screenshots exactly
- [ ] Shared sections extracted when reused across pages
- [ ] All `.astro` files have consistent `<head>` (meta, fonts)
- [ ] Components registered in Page.tsx pageComponents map as fallback
- [ ] Text content matches Figma design
