# Phase 4a: Convert Page Layout Shell

## Goal
Implement `Page.tsx` as the main layout wrapper and generic fallback page. If custom page components exist, Page.tsx dispatches to them based on slug.

## Input
- `$MIGRATION_DIR/design-map.md` — page list and shared components
- `$MIGRATION_DIR/vibe-output/` — vibe_figma generated code (visual accuracy reference)
- `$MIGRATION_DIR/screenshots/` — screenshots of the overall page layout

**Read the vibe_figma output first** to understand the exact layout structure, colors, and spacing used in the design. Then adapt it into the CMS Page.tsx pattern below.

## Pattern: Generic Page.tsx (no custom pages)

If the design has only one page layout, Page.tsx is simple:

```tsx
import { WebsiteDataProvider, ContentRenderer } from '@deepsel/cms-react';
import type { PageData } from '@deepsel/cms-utils';
import Menu from './Menu';
import Footer from './Footer';
import LangSwitcher from './LangSwitcher';

interface Props {
  pageData: PageData;
}

export default function Page({ pageData }: Props) {
  return (
    <WebsiteDataProvider
      pageData={pageData}
      languageAlternatives={pageData.language_alternatives}
    >
      <div className="min-h-screen flex flex-col">
        <header>
          {/* Header content — see 05-convert-header.md */}
          <Menu />
        </header>
        <main className="flex-1">
          <ContentRenderer />
        </main>
        <Footer />
      </div>
      <LangSwitcher />
    </WebsiteDataProvider>
  );
}
```

## Pattern: Page.tsx with custom page dispatch

If the design has multiple distinct pages, Page.tsx dispatches by slug:

```tsx
import { WebsiteDataProvider, ContentRenderer } from '@deepsel/cms-react';
import type { PageData } from '@deepsel/cms-utils';
import Menu from './Menu';
import Footer from './Footer';
import LangSwitcher from './LangSwitcher';
// Import page-specific components discovered from Figma:
import PageAbout from './PageAbout';
import PageServices from './PageServices';

interface Props {
  pageData: PageData;
}

// Map slugs to components — driven by design-map.md
const pageComponents: Record<string, React.FC> = {
  'about': PageAbout,
  'services': PageServices,
};

export default function Page({ pageData }: Props) {
  const slug = pageData.slug?.replace(/^\//, '') || '';
  const PageContent = pageComponents[slug];

  return (
    <WebsiteDataProvider
      pageData={pageData}
      languageAlternatives={pageData.language_alternatives}
    >
      <div className="min-h-screen flex flex-col">
        <header>
          {/* Header content */}
          <Menu />
        </header>
        <main className="flex-1">
          {PageContent ? <PageContent /> : <ContentRenderer />}
        </main>
        <Footer />
      </div>
      <LangSwitcher />
    </WebsiteDataProvider>
  );
}
```

**Note:** Even with the slug dispatch in Page.tsx, also create dedicated `.astro` files per page. The `.astro` route takes priority for SSR, and the slug dispatch in Page.tsx acts as a fallback safety net.

## Layout Rules
- The outermost div should be `min-h-screen flex flex-col`
- `<main>` gets `flex-1` to push footer to bottom
- Match the Figma layout: does the design use a max-width container? Full-width? Sidebar layout?
- If the design has a sidebar, wrap main content in a flex row:
  ```tsx
  <div className="flex flex-1">
    <Sidebar />
    <main className="flex-1">{/* content */}</main>
  </div>
  ```
- Check the design for background colors on the body/page level

## Checklist
- [ ] WebsiteDataProvider wraps everything
- [ ] pageData and languageAlternatives passed correctly
- [ ] Layout matches Figma (full-width vs contained, with/without sidebar)
- [ ] Footer pushed to bottom via flex
- [ ] All page components from design-map.md are imported and dispatched
- [ ] LangSwitcher included (positioned per design)
