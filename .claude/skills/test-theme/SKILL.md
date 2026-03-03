---
name: test-theme
description: Test a Deepsel CMS theme using Playwright. Takes screenshots, compares with Figma design screenshots, and reports differences. Use when asked to test a theme, verify theme rendering, or compare theme against design.
argument-hint: <theme-name>
---

# Theme Visual Testing

Test a Deepsel CMS theme by taking screenshots with Playwright and comparing against Figma design references. Automatically discovers ALL pages from the database, tests at 3 viewports, and runs a fix loop.

## Arguments

- `$0` — Theme name in kebab-case (e.g., `modern-landing`)

If no argument provided, ask the user which theme to test.

## Migration Folder

All migration data is stored in `figma_migration/<theme-name>-<YYYY-MM-DD>/`. Throughout this skill, `$MIGRATION_DIR` refers to this path. When testing, use the LATEST migration folder for the theme (sort by date).

To find the latest migration folder:
```bash
ls -d figma_migration/$ARGUMENTS-* 2>/dev/null | sort | tail -1
```

## Prerequisites

1. The backend must be running (`uvicorn main:app --reload` on port 8000)
2. The client dev server must be running (`npm run dev` on port 4322)
3. The theme must be registered in `client/src/themes.ts`
4. The theme must be activated in the database

Check if servers are running:
```bash
curl -s http://localhost:8000/api/v1/health || echo "Backend not running"
curl -s http://localhost:4322 || echo "Client not running"
```

## Subagent & Skill Usage

### Skills to Invoke
- **`/playwright-skill`** — Use this skill to capture all screenshots. It auto-detects the dev server and handles Playwright setup. Invoke it with instructions to capture each page at each viewport.

### Task Subagents for Parallel Comparison
When comparing screenshots (Step 5), spawn parallel Task subagents to compare multiple pages simultaneously:

```
Spawn parallel Task agents (subagent_type="general-purpose"):
- Agent 1: "Compare homepage screenshots. Read $MIGRATION_DIR/screenshots/homepage-desktop.png and $MIGRATION_DIR/test-results/run-NNN/homepage-desktop.png. Score layout, colors, typography, spacing, components, responsive. Return scores and issues."
- Agent 2: "Compare about page screenshots. Read $MIGRATION_DIR/screenshots/about-desktop.png and $MIGRATION_DIR/test-results/run-NNN/about-desktop.png..."
- Agent 3: "Compare blog page screenshots..."
```

Each agent reads both Figma and Playwright screenshots visually, scores them, and returns structured issues. The main conversation then aggregates results into the test report.

### Subagent Guidelines
- Each comparison agent should compare ONE page across all 3 viewports
- Agents return structured JSON-like output: `{ page, scores: { layout, colors, ... }, issues: [...] }`
- After aggregating, apply fixes in the main conversation (don't let subagents edit files)

## Step-by-Step Workflow

### Step 1: Verify Theme is Active

```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "SELECT selected_theme FROM organization LIMIT 1;"
```

If the theme is not active, activate it:
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "UPDATE organization SET selected_theme = '$ARGUMENTS' WHERE id = (SELECT id FROM organization LIMIT 1);"
```

### Step 2: Discover ALL Pages from Database
**Prompt:** `prompts/01-discover-pages.md`

Query the database for all pages:
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -t -A -c "SELECT slug FROM page WHERE organization_id = (SELECT id FROM organization LIMIT 1) ORDER BY slug;"
```

This gives the complete list of pages to test. Build the test page list:
- Every page slug from the DB query (e.g., `/`, `/about`, `/services`, `/contact`)
- `/blog` (blog list)
- `/blog/<first-post-slug>` (discover from blog list page)
- `/nonexistent-page-xyz` (404 page)

### Step 3: Create Versioned Test Directory

Find the next run number:
```bash
ls -d $MIGRATION_DIR/test-results/run-* 2>/dev/null | sort -V | tail -1
```

Create `$MIGRATION_DIR/test-results/run-NNN/` for this test run.

### Step 4: Take Screenshots with Playwright
**Prompt:** `prompts/02-capture-screenshots.md`

Use the `playwright-skill` to take screenshots of ALL discovered pages at 3 viewports.

**Viewports:**
| Name | Width | Height |
|------|-------|--------|
| desktop | 1920 | 1080 |
| tablet | 768 | 1024 |
| mobile | 375 | 812 |

**For EVERY page discovered in Step 2, capture at all 3 viewports.**

Save screenshots to the versioned directory with naming:
- `<slug>-desktop.png` (e.g., `homepage-desktop.png`, `about-desktop.png`)
- `<slug>-tablet.png`
- `<slug>-mobile.png`

For the homepage, use `homepage` as the slug name. For other pages, use the slug without leading `/`.

**Playwright script template:**
```javascript
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:4322';
const OUTPUT_DIR = path.join(process.cwd(), 'figma_migration', 'test-results', 'run-NNN');

const viewports = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

// Pages discovered from database query
const pages = [
  { name: 'homepage', path: '/' },
  // ... add all discovered pages ...
  { name: 'blog-list', path: '/blog' },
  { name: '404', path: '/nonexistent-page-xyz' },
];

(async () => {
  const browser = await chromium.launch();

  for (const [viewportName, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    for (const p of pages) {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${p.name}-${viewportName}.png`),
        fullPage: true,
      });
      console.log(`Captured: ${p.name}-${viewportName}.png`);
    }

    // Try to find and screenshot a blog post
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    const blogLink = await page.$('a[href^="/blog/"]');
    if (blogLink) {
      const href = await blogLink.getAttribute('href');
      await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `blog-post-${viewportName}.png`),
        fullPage: true,
      });
    }

    await context.close();
  }

  await browser.close();
  console.log('All screenshots captured!');
})();
```

### Step 5: Element-Level Comparison
**Prompt:** `prompts/03-compare-and-fix.md`

This is NOT a high-level "does it look similar" check. This is an **element-by-element** comparison that maps each React component's DOM output to the corresponding Figma element.

**For each page, load ALL of:**
1. Figma screenshot (`$MIGRATION_DIR/screenshots/`)
2. Test screenshot (`$MIGRATION_DIR/test-results/run-NNN/`)
3. React component source code (`themes/<name>/components/`)
4. Design tokens (`$MIGRATION_DIR/design-tokens.md`)

**Then for EACH component (Header, Hero, each Section, Footer):**
1. Read the component's source code
2. Identify each DOM element (container, logo, links, buttons, images, icons, text)
3. For each element, compare: code value vs design-token value vs Figma screenshot vs test screenshot
4. Record match/mismatch in a table with exact fix instructions

**Elements to check per component:**

#### Per-element checks
- Background color: exact hex match against design-tokens.md
- Font: family, size, weight, color, line-height — all must match
- Spacing: padding, margin, gap — must match token values
- Borders: width, color, radius — must match
- Images: actual Figma asset used? Or placeholder/missing?
- Icons: actual Figma SVG? Or FontAwesome substitute?
- Text content: matches Figma word-for-word?
- Layout: flex direction, alignment, column count — must match
- Shadows, opacity, gradients: must match token values

#### Missing/Extra element checks
- [ ] Every photo in Figma appears in test (not gray placeholder)
- [ ] Every icon in Figma appears in test (actual SVG, not FontAwesome substitute)
- [ ] Every background image in Figma appears in test (not solid color)
- [ ] No extra elements in test that don't exist in Figma
- [ ] No missing elements in test that DO exist in Figma
- [ ] Text content matches Figma in correct language

**Scoring: count individual elements matching vs total elements checked. Target: ≥ 95% match rate.**

### Step 6: Generate Element-Level Test Report

Create `$MIGRATION_DIR/test-results/run-NNN/test-report.md` with element-level detail:

```markdown
# Element-Level Test Report: <theme-name>
Run: NNN | Date: <current-date> | Iteration: N

## Summary
- Elements checked: X
- Elements matching: Y
- Match rate: Y/X = Z%
- Target: ≥ 95%

## Page: Homepage

### Component: Header (Page.tsx:15-35)
| Element | Token Value | Code Value | Match? | Fix |
|---------|------------|------------|--------|-----|
| Container bg | #FFFFFF | bg-white | ✓ | — |
| Logo font | Inter 20px bold #1A1A2E | text-xl font-bold text-[#1A1A2E] | ✓ | — |
| Menu link color | #4A4A68 | text-gray-700 | ✗ | → text-[#4A4A68] |
**Header: 2/3 match**

### Component: Hero (PageHome.tsx:5-40)
| Element | Token Value | Code Value | Match? | Fix |
|---------|------------|------------|--------|-----|
| Background | hero-bg.jpg + overlay | bg-[#0F172A] solid | ✗ | → add img + overlay |
| Headline | 56px bold white | text-4xl | ✗ | → text-[56px] |
**Hero: 0/2 match**

(repeat for every component)

## Fix List (by priority)
1. [P1-COLOR] Header bg: bg-slate-900 → bg-white (Page.tsx:16)
2. [P2-ASSET] Hero bg: add hero-bg.jpg (PageHome.tsx:8)
3. [P2-ASSET] Icons: replace FontAwesome with actual SVGs (PageHome.tsx:65)
...
```

### Step 7: Fix and Re-test Loop (max 10 iterations)
**Prompt:** `prompts/03-compare-and-fix.md`

For each element mismatch found, apply fixes in priority order:

1. **Priority 1: Wrong colors/backgrounds** — Most visually impactful, often cascading
   - Header/footer background color wrong (e.g., dark when should be white)
   - Section background colors wrong
   - Button/link colors wrong

2. **Priority 2: Missing assets** — Immediately noticeable
   - Photos showing as placeholders → import actual Figma photos
   - Icons replaced with FontAwesome → import actual Figma SVGs
   - Background images missing → import and add hero/section bg images

3. **Priority 3: Wrong layout/spacing** — Affects overall feel
   - Wrong flex direction, grid columns, container width
   - Wrong padding/gap/margin values (use exact token px → Tailwind)

4. **Priority 4: Wrong typography** — Subtle but important
   - Wrong font family (check Google Fonts `<link>` in .astro files)
   - Wrong font size/weight/color (use exact token values)

5. **Priority 5: Wrong element details** — Fine-tuning
   - Wrong border-radius, border color/width, shadow
   - Wrong hover/active states, wrong opacity

**Fix loop process:**
1. Read the element-level fix list from the report
2. Apply ALL P1 (color) fixes first — these cascade (fixing header bg fixes child colors)
3. Apply ALL P2 (asset) fixes — import actual images, replace FontAwesome substitutes
4. Wait for hot-reload (3 seconds)
5. Re-take screenshots for affected pages
6. Re-run element-level comparison (code vs tokens vs screenshot)
7. Update test report with new element match counts
8. Repeat until match rate ≥ 95% or max 10 iterations

### Step 8: Final Verification

After the fix loop:
1. Run full screenshot capture of ALL pages at ALL viewports (new run directory)
2. Verify no regressions introduced by fixes
3. Check for:
   - Browser console errors (use Playwright to capture)
   - Missing images/assets (404s in network tab)
   - Broken navigation links
   - Language switcher functionality
   - Blog pagination
   - Mobile menu open/close
4. Generate final test report

## Troubleshooting

### Theme not rendering
- Check `client/src/themes.ts` has correct imports
- Verify theme name matches in database and themeMap
- Check for TypeScript errors: `npm run build` in project root

### Missing styles
- Verify `main.css` is imported in all `.astro` files
- Check Tailwind content paths in `tailwind.config.js`
- Run `npm run build` to rebuild CSS

### Server not responding
- Start backend: `cd backend && uvicorn main:app --reload`
- Start client: `npm run dev`
- Check ports: 8000 (backend), 4322 (client)

### Database connection
- Start DB: `docker-compose -f local.docker-compose.yml up -d deepsel-cms-db`
- Verify: `pg_isready -h localhost -p 5432`

### Pages not rendering with custom theme component
- Verify the `.astro` file slug matches the CMS page slug exactly
- Check `client/src/themes.ts` has the slug key in the theme map
- Check `getThemeComponent.ts` logic — it tries `themeMap[theme][slug]` then falls back to `index`
