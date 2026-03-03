# Phase 6: Register and Deploy Theme

## Goal
Register the theme in the system, activate it in the database, install dependencies, and verify it builds.

## Process

### Step 1: Generate theme imports
Run the backend's theme import generator to update `client/src/themes.ts`:
```bash
cd backend && python -c "from apps.cms.utils.theme_imports import generate_theme_imports; generate_theme_imports('apps/cms/data')"
```

If this fails, manually update `client/src/themes.ts`:

1. Add imports between `// THEME_IMPORTS_START` and `// THEME_IMPORTS_END` markers
2. Add theme map entry between `// THEME_MAP_START` and `// THEME_MAP_END` markers

Example for a theme with custom pages:
```typescript
// THEME_IMPORTS_START
// ... existing imports ...
import MyThemeIndex from "../../themes/my-theme/Index.astro";
import MyThemeBlog from "../../themes/my-theme/Blog.astro";
import MyThemeSingleBlog from "../../themes/my-theme/single-blog.astro";
import MyTheme404 from "../../themes/my-theme/404.astro";
import MyThemeAbout from "../../themes/my-theme/about.astro";
import MyThemeServices from "../../themes/my-theme/services.astro";
// THEME_IMPORTS_END

// THEME_MAP_START
export const themeMap = {
  // ... existing themes ...
  'my-theme': {
    [themeSystemKeys.Page]: MyThemeIndex,
    [themeSystemKeys.BlogList]: MyThemeBlog,
    [themeSystemKeys.BlogPost]: MyThemeSingleBlog,
    [themeSystemKeys.NotFound]: MyTheme404,
    'about': MyThemeAbout,
    'services': MyThemeServices,
  },
};
// THEME_MAP_END
```

### Step 2: Activate in database
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "UPDATE organization SET selected_theme = '<theme-name>' WHERE id = (SELECT id FROM organization LIMIT 1);"
```

### Step 3: Install dependencies
```bash
cd /path/to/project-root && npm install
```

### Step 4: Build
```bash
npm run build
```

### Step 5: Fix build errors
If the build fails:
1. Read the error message carefully
2. Common issues:
   - Missing imports: add the import statement
   - Type errors: fix TypeScript types
   - Missing dependencies: add to theme's `package.json` and `npm install`
   - Tailwind class issues: check `tailwind.config.js` content paths
3. Fix and rebuild until clean

### Step 6: Start dev server and verify
```bash
npm run dev
```
Open `http://localhost:4322` and verify:
- Homepage renders with the theme
- Navigation works
- Blog list page works (`/blog`)
- 404 page works (visit `/nonexistent-page-xyz`)
- Custom pages render (visit each slug)

## Checklist
- [ ] Theme imports added to `client/src/themes.ts`
- [ ] Theme map entry includes all `.astro` files (required + custom pages)
- [ ] Theme activated in database
- [ ] `npm install` completed successfully
- [ ] `npm run build` passes with no errors
- [ ] Dev server starts and theme renders
- [ ] All pages load without console errors
