---
name: test-theme
description: Test a Deepsel CMS theme using Playwright. Takes screenshots, runs interactive tests (clicks, navigation, mobile menu), compares with Figma design, and reports differences. Use when asked to test a theme, verify theme rendering, or compare theme against design.
argument-hint: <theme-name>
---

# Theme Full Testing

Test a Deepsel CMS theme comprehensively: visual screenshots, interactive testing (clicks, navigation, mobile menu, console errors), and element-level comparison against Figma design references. Tests EVERY page from the database, one page at a time, at 3 viewports.

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

If servers are not running, notify the user and wait. Do NOT proceed without both servers.

## Subagent & Skill Usage

### Skills to Invoke
- **`/playwright-skill`** — Use for all browser automation. It auto-detects dev server and handles Playwright setup.

### Task Subagents
- Use parallel Task subagents (subagent_type="general-purpose") for **screenshot comparison only** — spawn one agent per page to compare Figma vs test screenshots simultaneously
- Do NOT use subagents for interactive testing — run those sequentially in the main conversation to handle failures properly

## Step-by-Step Workflow

### Step 1: Verify Theme is Active
**Prompt:** `prompts/01-discover-pages.md`

```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "SELECT selected_theme FROM organization LIMIT 1;"
```

If not active, activate it:
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "UPDATE organization SET selected_theme = '$ARGUMENTS' WHERE id = (SELECT id FROM organization LIMIT 1);"
```

### Step 2: Discover ALL Pages from Database
**Prompt:** `prompts/01-discover-pages.md`

Query for all page slugs and blog posts. Build the complete test page list including:
- Every page slug from DB
- `/blog` (blog list)
- A blog post (discovered from DB)
- `/nonexistent-page-xyz` (404 page)

### Step 3: Create Versioned Test Directory

Find the next run number and create `$MIGRATION_DIR/test-results/run-NNN/`.

### Step 4: Test Each Page — ONE AT A TIME
**Prompt:** `prompts/02-full-page-test.md`

For EACH page discovered in Step 2, run a COMPLETE test cycle before moving to the next page. The test cycle per page includes:

1. **Visual screenshots** at 3 viewports (desktop/tablet/mobile)
2. **Interactive tests** (clicks, navigation, console errors)
3. **Mobile-specific tests** (hamburger menu, touch interactions)
4. **Element-level comparison** against Figma reference (if available)

**DO NOT batch all screenshots first then test interactively later.** Test everything per page, then move to the next page. This way, if a page has issues, they're caught immediately.

**Per-page test cycle:**

```
For each page in test_pages:
  1. Desktop viewport (1920x1080):
     - Navigate to page
     - Wait for load + hydration
     - Check console for errors
     - Take full-page screenshot
     - Test clickable elements (buttons, links)
     - Verify navigation links work

  2. Tablet viewport (768x1024):
     - Navigate to page
     - Take full-page screenshot
     - Check if hamburger menu appears (responsive breakpoint)
     - Test visible interactions

  3. Mobile viewport (375x812):
     - Navigate to page
     - Take full-page screenshot
     - Test hamburger menu: click to open, verify menu items visible, click to close
     - Test mobile-specific interactions
     - Take screenshot with menu open

  4. Compare against Figma reference (if available)
  5. Log results for this page

  Print: "Page X/Y tested: <slug> — <pass/fail>"
```

### Step 5: Interactive Testing Details
**Prompt:** `prompts/02-full-page-test.md`

For each page, run these interactive tests:

#### 5a. Console Error Check
```javascript
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push(err.message));
// Navigate and interact...
// At end: report any errors found
```

#### 5b. Navigation Link Test
```javascript
// Collect all internal links on the page
const links = await page.$$eval('a[href^="/"]', anchors =>
  anchors.map(a => ({ href: a.href, text: a.textContent.trim() }))
);
// Verify each unique internal link responds (not 500)
for (const link of uniqueLinks) {
  const response = await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  if (!response || response.status() >= 500) {
    issues.push(`Broken link: ${link.text} → ${link.href} (${response?.status()})`);
  }
  await page.goBack();
}
```

#### 5c. Button Click Test
```javascript
// Find all visible buttons
const buttons = await page.$$('button:visible');
for (const button of buttons) {
  const text = await button.textContent();
  try {
    await button.click({ timeout: 3000 });
    // Wait briefly for any reaction (modal, menu, navigation)
    await page.waitForTimeout(500);
    // Check no error occurred
  } catch (e) {
    issues.push(`Button not clickable: "${text}"`);
  }
}
```

#### 5d. Mobile Hamburger Menu Test
```javascript
// On mobile viewport only
const hamburger = await page.$([
  'button[aria-label*="menu" i]',
  'button[aria-label*="Menu"]',
  '[data-testid="mobile-menu"]',
  '.lg\\:hidden button',
  'button:has(svg[class*="menu"])',
  'header button.lg\\:hidden',
].join(', '));

if (hamburger) {
  // 1. Click to open
  await hamburger.click();
  await page.waitForTimeout(500);

  // 2. Verify menu is visible
  const menuVisible = await page.isVisible('nav, [role="navigation"], [data-testid="mobile-nav"]');

  // 3. Screenshot with menu open
  await page.screenshot({ path: `${slug}-mobile-menu-open.png` });

  // 4. Check menu items are present
  const menuItems = await page.$$('nav a, [role="navigation"] a');

  // 5. Click a menu link — verify it navigates
  if (menuItems.length > 0) {
    const firstLink = menuItems[0];
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await page.waitForTimeout(1000);
    // Verify navigation occurred
  }

  // 6. Go back, re-open menu, click close/hamburger again
  await page.goBack();
  await hamburger.click();
  await page.waitForTimeout(300);
  await hamburger.click(); // Close
  await page.waitForTimeout(300);
  // Verify menu is hidden again
}
```

#### 5e. Blog-Specific Tests (for blog list page)
```javascript
// Test pagination if exists
const paginationLinks = await page.$$('.pagination a, nav[aria-label="pagination"] a');
if (paginationLinks.length > 0) {
  await paginationLinks[0].click();
  await page.waitForTimeout(1000);
  // Verify page changed (URL or content)
}

// Test blog post link
const blogPostLink = await page.$('a[href^="/blog/"]');
if (blogPostLink) {
  await blogPostLink.click();
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  // Verify blog post rendered (has article content)
  const hasContent = await page.$('article, .blog-post, .content-renderer');
}
```

#### 5f. Language Switcher Test (if present)
```javascript
const langSwitcher = await page.$('[data-testid="lang-switcher"], .lang-switcher, select[name="language"]');
if (langSwitcher) {
  await langSwitcher.click();
  await page.waitForTimeout(500);
  // Take screenshot showing language options
  await page.screenshot({ path: `${slug}-lang-switcher-open.png` });
}
```

### Step 6: Element-Level Visual Comparison
**Prompt:** `prompts/03-compare-and-fix.md`

After interactive tests, compare screenshots against Figma references using subagents:

```
Spawn parallel Task agents (subagent_type="general-purpose"):
- Agent per page: "Compare <page> screenshots. Read Figma reference and test screenshot.
  Also read the theme component source code for this page.
  Compare each element's Tailwind classes against the vibe_figma output.
  Return: element drift table, match score, and fix list."
```

### Step 7: Generate Full Test Report

Create `$MIGRATION_DIR/test-results/run-NNN/test-report.md`:

```markdown
# Full Test Report: <theme-name>
Run: NNN | Date: <current-date> | Iteration: N

## Summary
- Pages tested: X
- Pages passed: Y/X
- Interactive tests: Z passed / W total
- Console errors: N
- Broken links: N
- Visual match rate: Z%

## Per-Page Results

### Page: Homepage (/)
**Visual:** desktop ✓ | tablet ✓ | mobile ✓
**Console errors:** 0
**Broken links:** 0
**Interactive tests:**
- [✓] All buttons clickable
- [✓] Navigation links work
- [✓] Mobile hamburger opens/closes
- [✓] Mobile menu links navigate correctly
**Visual match:** 87% (12 drifts found)
**Element drifts:**
| Element | Expected | Actual | Fix |
|---------|----------|--------|-----|
| Header bg | bg-white | bg-slate-900 | Page.tsx:16 |
| ... | ... | ... | ... |

### Page: About (/about)
**Visual:** desktop ✓ | tablet ✓ | mobile ✓
**Console errors:** 0
**Broken links:** 0
**Interactive tests:**
- [✓] All buttons clickable
- [✗] "Contact us" button navigates to 404
**Issues:**
- Button href="/kontakt" but page slug is "/contact"

### Page: Blog (/blog)
**Visual:** desktop ✓ | tablet ✓ | mobile ✓
**Console errors:** 0
**Interactive tests:**
- [✓] Blog post links work
- [✓] Pagination works
- [✗] No pagination — only 2 posts

### Page: 404 (/nonexistent-page-xyz)
**Visual:** desktop ✓ | tablet ✓ | mobile ✓
**Console errors:** 0
**404 behavior:** ✓ Shows custom 404 page (not blank/error)

## Issue Summary
| # | Severity | Page | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | P1 | Homepage | Header bg wrong | Page.tsx:16 bg-slate-900 → bg-white |
| 2 | P1 | All pages | Console error: Failed to load font | Add Google Fonts link |
| 3 | P2 | About | Broken button link | Fix href |
| 4 | P3 | Homepage | Hero padding wrong | PageHome.tsx:8 px-4 → px-16 |
```

### Step 8: Fix and Re-test Loop (max 5 iterations)
**Prompt:** `prompts/03-compare-and-fix.md`

For each issue found:

1. **Fix all P1 issues first** — colors, console errors, broken critical paths
2. **Fix all P2 issues** — broken links, missing assets, interaction failures
3. **Fix P3-P5 issues** — spacing, typography, fine details
4. Wait for hot-reload (3 seconds)
5. Re-test ONLY the affected pages (not all pages again)
6. Update test report with new results
7. Repeat until:
   - All interactive tests pass (no console errors, no broken links, menu works)
   - Visual match rate >= 95%
   - Or max 5 iterations reached

**IMPORTANT:** Interactive test failures (console errors, broken links, non-functional menu) are HIGHER priority than visual drift. Fix functional issues before cosmetic ones.

### Step 9: Final Verification

After the fix loop, run ONE complete test of all pages:
1. Fresh screenshots at all viewports
2. All interactive tests re-run
3. Generate final test report
4. Print summary:
```
Final Test Results: <theme-name>
Pages: X/X passed
Interactive: Y/Y passed
Visual match: Z%
Console errors: 0
Broken links: 0
Status: PASS / FAIL (with reasons)
```

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

### Hamburger menu not found
- Check if the theme uses a different breakpoint (e.g., `md:hidden` vs `lg:hidden`)
- Look for `aria-label` on the hamburger button
- Try broader selectors: `header button`, `nav button`
