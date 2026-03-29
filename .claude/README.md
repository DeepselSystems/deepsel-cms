# Claude Code Skills — Developer Guide

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| **figma-to-theme** | `/figma-to-theme <figma-url> <theme-name>` | Convert Figma design into a CMS theme |
| **test-theme** | `/test-theme <theme-name>` | Full visual + interactive testing of a theme |
| **publish-package** | `/publish-package <package-name> [version]` | Format, prepush, fix, tag, and push tag to trigger npm publish |

---

## Figma to Theme — Complete Workflow

### Prerequisites

Before running the skill, make sure you have:

1. **Figma MCP servers** configured in `.mcp.json` (already set up in this repo)
2. **Figma Personal Access Token** — get from https://www.figma.com/settings
   ```bash
   export FIGMA_TOKEN="your-token-here"
   ```
3. **vibe_figma** installed globally or available via npx:
   ```bash
   npx vibefigma --help
   ```
4. **Backend + DB running**:
   ```bash
   docker-compose -f local.docker-compose.yml up -d deepsel-cms-db
   cd backend && uvicorn main:app --reload
   ```
5. **Client dev server**:
   ```bash
   npm run dev
   ```

### How to Run

```
/figma-to-theme https://www.figma.com/design/YOUR_FILE_ID/Your-Design <theme-name>
```

### Workflow Phases

```
Phase 1: Fetch Figma Data
  ├── Discover all frames in Figma file
  ├── Download screenshots for every frame
  └── Save frames.json with metadata + Figma URLs
           ⚠️ CAN FAIL: Figma rate limit (see Tips below)

Phase 2: Analyze Design
  ├── Read all screenshots visually
  ├── Classify frames (pages vs components vs noise)
  └── Create design-map.md with page list + Figma URLs
           ⚠️ CHECK: Some frames may be misclassified

Phase 2b: Generate React Code with vibe_figma
  ├── Run vibe_figma for each page (sequential, with delays)
  ├── Generate pixel-accurate React + Tailwind components
  └── Extract assets (images, icons, SVGs)
           ⚠️ CAN FAIL: Figma rate limit
           ⚠️ CHECK: vibe_figma may miss some pages or produce
              incomplete output — verify all pages generated

Phase 3: Create Theme Skeleton
  ├── Copy base theme (interlinked)
  ├── Create .astro entry points for each page
  ├── Create component shells
  └── Copy assets from vibe_figma output

Phase 4: Convert Components
  ├── Transform vibe_figma code into CMS theme components
  ├── Add CMS integration (menus, language, providers)
  ├── Method: COPY from vibe_figma → EDIT to add CMS features
  └── Order: Layout → Header → Menu → Footer → Hero → Sections → Blog → Custom Pages

Phase 5: UI Re-verification (Code Review)
  ├── Compare every Tailwind class: theme code vs vibe_figma
  ├── Find and fix drifts (styles lost during transformation)
  └── Pure code review — no deployment needed

Phase 6: Colors & Fonts
  ├── Extract color palette, generate CSS variables
  └── Set up Google Fonts

Phase 7: Register & Deploy
  ├── Update client/src/themes.ts
  ├── Activate in database
  └── npm install + build

Phase 8: Test & Iterate (invokes /test-theme)
  ├── Screenshot all pages at 3 viewports
  ├── Interactive testing (menu, buttons, links)
  └── Fix loop until all tests pass
```

### What You Get (Output)

The skill produces a **client-side rendered theme** with:

- **React components** (`.tsx`) — Page, Menu, Footer, BlogList, BlogPost, custom pages
- **Astro entry points** (`.astro`) — SSR wrappers that load React components
- **CSS** — Tailwind with design-accurate colors and fonts
- **Assets** — images, icons, SVGs extracted from Figma

**Important:** All page content is rendered **client-side via React**. The `.astro` files are thin SSR shells that fetch data and pass it to React components. Custom page components (PageHome, PageAbout, etc.) contain hardcoded JSX sections from the Figma design.

### After Conversion — Common Follow-up Tasks

The generated theme works but you'll likely want to improve it. Here are common follow-up prompts:

#### Convert to Backend-Rendered Pages

The custom page components (PageHome.tsx, PageAbout.tsx) use hardcoded JSX. To make content editable via the CMS admin:

```
"Convert PageHome sections to use ContentRenderer so content is editable from admin panel"
```

```
"Replace the hardcoded hero text in PageHome with CMS page content"
```

#### Fix Menu Issues (very common)

```
"Fix the mobile hamburger menu — it doesn't open/close properly"
```

```
"The menu links don't highlight the active page, fix active state"
```

```
"Menu items flash/jump on first load — fix SSR hydration mismatch"
```

```
"Menu is fixed/sticky but overlaps content, fix the spacing"
```

#### Fix Mobile Issues

```
"The hero section text overflows on mobile, fix responsive layout"
```

```
"Images are too large on mobile, add responsive sizing"
```

```
"Footer columns should stack on mobile instead of staying in a row"
```

#### Fix SSR Hydration Issues

```
"There's a hydration mismatch error in the console — the menu renders differently on server vs client"
```

```
"The page flashes unstyled content on first load, fix FOUC"
```

#### Improve Visual Accuracy

```
"Compare the homepage against the vibe_figma output and fix any Tailwind class differences"
```

```
"The spacing/padding doesn't match the Figma design, check and fix all values"
```

---

## Tips for Better Results

### Dealing with Figma Rate Limits

The Figma API has strict rate limits. The skill will auto-retry with delays, but if it keeps failing:

- **Wait 3-5 minutes** when prompted, then confirm to continue
- **Use multiple Figma tokens** — create several Personal Access Tokens and switch:
  ```
  "Switch to this Figma token: figd_xxxx and retry the failed page"
  ```
- **Run during off-peak hours** — fewer API users = fewer rate limits
- **Reduce frame count** — if your Figma file has many frames, consider using a specific page URL instead of the full file URL

### Verify vibe_figma Output

After Phase 2b, always check the generated code:

```
"Show me the vibe_figma output summary — which pages were generated and how many assets?"
```

If a page is missing or incomplete:

```
"Re-run vibe_figma for the about page, it didn't generate properly"
```

### Common Issues and Quick Fixes

| Issue | Prompt to Fix |
|-------|--------------|
| Menu not working on mobile | `"Fix mobile hamburger menu toggle"` |
| Menu links cause full page reload | `"Use client-side navigation for menu links"` |
| Menu active state wrong | `"Fix menu active state highlighting for current page"` |
| Sticky header overlaps content | `"Add padding-top to main content to account for fixed header"` |
| Images not loading | `"Check and fix all image import paths in the theme"` |
| Fonts not loading | `"Verify Google Fonts link is correct in all .astro files"` |
| Colors don't match design | `"Compare CSS variables in main.css against Figma design colors"` |
| Blog page shows empty | `"Check BlogList component — verify it receives blogListData prop"` |
| 404 page is blank | `"Fix 404.astro — make sure it imports and renders the 404 component"` |
| Page slug not matching | `"The /about page shows generic content — check if about.astro exists and is registered in themes.ts"` |
| Hydration error in console | `"Fix React hydration mismatch — check for browser-only code in SSR-rendered components"` |
| Language switcher broken | `"Fix LangSwitcher — verify useLanguage hook and language URL prefixes"` |

### Prompt Engineering Tips

1. **Be specific about which page/component** — "Fix the header in PageHome" not just "Fix the header"

2. **Reference the vibe_figma output** — "Make the footer match the vibe_figma output exactly" triggers the code comparison process

3. **One issue at a time** — fixing multiple unrelated issues in one prompt often causes regressions

4. **Ask for verification** — "Fix X and then take a screenshot to verify" ensures the fix actually works

5. **When stuck on visual accuracy** — the magic prompt:
   ```
   "Read the vibe_figma output for this page and compare every Tailwind class
    against the theme component. Copy the exact classes from vibe_figma and
    fix any differences."
   ```

6. **For persistent menu issues** — menus are the most complex component:
   ```
   "Review Menu.tsx: check that (1) mobile hamburger opens/closes with state,
    (2) clicking a link closes the mobile menu, (3) active state uses
    isActiveMenu from cms-utils, (4) no SSR hydration issues with useState"
   ```

---

## Test Theme — How to Use

```
/test-theme <theme-name>
```

This runs a comprehensive test: screenshots at 3 viewports (desktop/tablet/mobile), interactive tests (menu clicks, button clicks, link verification, console error checking), and visual comparison against Figma references.

Tests are run **one page at a time** — each page gets a full test cycle before moving to the next.

Results are saved to `figma_migration/<theme-name>-<date>/test-results/run-NNN/`.

---

## File Structure Reference

```
.claude/
├── README.md                              ← You are here
├── skills/
│   ├── figma-to-theme/
│   │   ├── SKILL.md                       # Main orchestrator (8 phases)
│   │   ├── figma-conversion-guide.md      # Figma → Tailwind mapping tables
│   │   ├── theme-reference.md             # Theme system documentation
│   │   └── prompts/                       # Per-phase detailed instructions
│   │       ├── 01-fetch-figma-data.md
│   │       ├── 01b-extract-assets.md
│   │       ├── 01c-extract-design-tokens.md
│   │       ├── 02-analyze-design.md
│   │       ├── 02b-vibefigma-codegen.md
│   │       ├── 03-create-theme-skeleton.md
│   │       ├── 04-convert-layout.md
│   │       ├── 05-convert-header.md
│   │       ├── 05b-reverify-ui.md
│   │       ├── 06-convert-menu.md
│   │       ├── 07-convert-footer.md
│   │       ├── 08-convert-hero.md
│   │       ├── 09-convert-page-sections.md
│   │       ├── 10-convert-blog.md
│   │       ├── 11-convert-custom-pages.md
│   │       ├── 12-convert-sidebar.md
│   │       ├── 13-convert-lang-switcher.md
│   │       ├── 14-colors-and-fonts.md
│   │       ├── 15-register-and-deploy.md
│   │       └── 16-responsive-rules.md
│   └── test-theme/
│       ├── SKILL.md                       # Test orchestrator
│       └── prompts/
│           ├── 01-discover-pages.md
│           ├── 02-full-page-test.md
│           └── 03-compare-and-fix.md
└── ...
```
