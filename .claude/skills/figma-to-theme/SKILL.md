---
name: figma-to-theme
description: Convert a Figma design into a Deepsel CMS theme. Use when asked to create a new theme from Figma, convert Figma to theme, or generate theme from design. Triggers on Figma URLs or design conversion requests.
argument-hint: <figma-url> <theme-name>
---

# Figma to Theme Converter

Convert a Figma design into a complete Deepsel CMS Astro + React theme.

Uses **vibe_figma** to generate pixel-accurate React components from Figma, then adapts them into the CMS theme system (menus, language, layout, routing, etc.).

## Arguments

- `$0` — Figma file/frame URL (e.g., `https://www.figma.com/design/...`)
- `$1` — Theme name in kebab-case (e.g., `modern-landing`)

If arguments are missing, ask the user for them.

## Prerequisites

### 1. Figma MCP (for screenshots & frame discovery)

Verify MCP servers are available by checking if Figma tools exist:
1. **figma** (official remote) — `https://mcp.figma.com/mcp`
2. **figma-context** (Framelink) — `npx figma-context-mcp` (needs `FIGMA_API_KEY` env var)

If neither works, instruct the user to set up a Figma API key.

### 2. vibe_figma (for React code generation)

Check if vibe_figma is available:
```bash
npx vibefigma --help 2>/dev/null && echo "vibefigma available" || echo "vibefigma NOT found"
```

Check for Figma token:
```bash
echo ${FIGMA_TOKEN:+"token set"} || echo "FIGMA_TOKEN not set"
```

**If vibe_figma is not working:**
1. Verify `FIGMA_TOKEN` is set in the environment (or `.env` file in project root)
   - Get token from: https://www.figma.com/settings → Personal Access Tokens
2. Test with: `npx vibefigma "https://www.figma.com/design/EXAMPLE" --token $FIGMA_TOKEN`
3. If issues persist, ask the user to set up the token

**Optional:** `GOOGLE_GENERATIVE_AI_API_KEY` env var enables the `--clean` flag for AI-powered code cleanup.

### 3. Figma Token Setup Helper

If `FIGMA_TOKEN` is not set, guide the user:
```
To use vibe_figma, you need a Figma Personal Access Token:
1. Go to https://www.figma.com/settings
2. Scroll to "Personal Access Tokens"
3. Click "Generate new token"
4. Copy the token and run:
   export FIGMA_TOKEN="your-token-here"
   (or add to your .env file)
```

## Figma Rate Limit Policy (GLOBAL — applies to ALL phases)

Figma API has strict rate limits. This skill makes many calls (screenshots, frame data, vibe_figma). The policy is:

**NEVER skip or abandon a step due to rate limits. ALWAYS wait and retry.**

### Rate limit handling for MCP calls (Phase 1):
1. Process ONE call at a time, sequentially
2. Wait **3 seconds** between each call
3. On rate limit (429 or "rate limit" in response):
   - Wait **30 seconds**, retry
   - If still limited, wait **60 seconds**, retry
   - If still limited, wait **120 seconds**, retry
   - If still failing after 4 attempts: **STOP and notify the user**:
     ```
     ⚠️ Figma API rate limit reached after 4 retries on frame "<name>".
     Please wait 2-3 minutes and confirm when ready to continue.
     Remaining: X frames to process.
     ```
   - **Do NOT skip the frame. Do NOT continue to next phase.** Wait for user confirmation, then retry.

### Rate limit handling for vibe_figma (Phase 2b):
1. Process ONE page at a time, sequentially
2. Wait **5 seconds** between each page (vibe_figma makes multiple internal API calls)
3. On failure (exit code ≠ 0, or output contains "rate limit" / "429"):
   - Wait **60 seconds**, retry
   - If still failing, wait **120 seconds**, retry
   - If still failing after 3 attempts: **STOP and notify the user**:
     ```
     ⚠️ vibe_figma rate limited on page "<slug>" after 3 retries.
     Please wait 3-5 minutes and confirm when ready to continue.
     Completed: X/Y pages. Remaining: Z pages.
     ```
   - **Do NOT skip the page.** Wait for user, then retry that same page.

### Key principle:
- **Slow and complete > fast and incomplete**
- **Every frame must have its screenshot. Every page must have its vibe_figma output.**
- If the user needs to wait, tell them honestly how long and what's left
- After user confirms, resume from exactly where it stopped (not from the beginning)

## Subagent & Skill Orchestration

This skill uses Claude subagents and other skills for parallel work:

### Task Subagents
Use the **Task tool** to spawn parallel subagents for:
- **Phase 4 (Component conversion)**: Spawn parallel agents to convert independent components simultaneously (e.g., Footer + Sidebar + LangSwitcher can be converted in parallel since they don't depend on each other)
- **Phase 7 (Testing)**: Spawn a subagent to run `/test-theme` while you review the build output

**IMPORTANT: Do NOT use parallel subagents for Phase 1 or Phase 2b (Figma API calls).** All Figma-related operations must be sequential with delays to avoid rate limiting.

Example — parallel component conversion:
```
Use Task tool with subagent_type="general-purpose" to:
- Agent 1: "Convert Footer.tsx for theme <name> following prompts/07-convert-footer.md. Reference vibe_figma output in $MIGRATION_DIR/vibe-output/ and design map in $MIGRATION_DIR/design-map.md"
- Agent 2: "Convert Sidebar.tsx for theme <name> following prompts/12-convert-sidebar.md..."
- Agent 3: "Convert LangSwitcher.tsx for theme <name> following prompts/13-convert-lang-switcher.md..."
```

### Skills to Invoke
- **`/vercel-react-best-practices`** — After converting all React components (end of Phase 4), invoke this skill to review the React code for performance issues. Apply suggested fixes before proceeding to Phase 5.
- **`/playwright-skill`** — Used in Phase 7 via `/test-theme` for screenshot capture. Can also be invoked directly during Phase 6 to quickly verify the theme renders.
- **`/test-theme <theme-name>`** — Invoked at Phase 7 for full automated testing.

### Subagent Guidelines
- Only spawn parallel agents for truly independent work (no shared file writes)
- Each agent must be given the full context: theme name, file paths, design map location
- After parallel agents complete, review their output for consistency before proceeding
- If an agent fails, retry it once; if it fails again, do the work in the main conversation

## Migration Folder Convention

Each conversion run stores ALL migration data in a subfolder.

```
figma_migration/<theme-name>-<YYYY-MM-DD>/
├── screenshots/          # Figma frame screenshots (for testing & visual reference)
├── design-data/          # Frame index and metadata
│   └── frames.json       # Frame index with names, dimensions, node URLs
├── design-map.md         # Page/component mapping (Phase 2)
├── vibe-output/          # vibe_figma generated React code (Phase 2b)
│   ├── homepage/         # Per-page output
│   │   ├── Component.tsx
│   │   └── assets/       # Assets extracted by vibe_figma
│   ├── about/
│   └── ...
└── test-results/         # Playwright test runs (Phase 7)
    ├── run-001/
    ├── run-002/
    └── ...
```

**Variable:** Throughout this skill and all prompt files, `$MIGRATION_DIR` refers to `figma_migration/<theme-name>-<YYYY-MM-DD>`. Create this folder at the start of Phase 1 using the current date.

Example: for theme `alcoris` on 2026-02-27 → `figma_migration/alcoris-2026-02-27/`

This keeps migration data organized per conversion attempt. Previous runs are preserved.

## Phased Workflow

This skill follows a strict phase order. Each phase has a detailed prompt file in `prompts/`. Read the referenced prompt file BEFORE executing each phase.

---

### Phase 1: Figma Frame Discovery & Screenshots
**Prompt:** `prompts/01-fetch-figma-data.md`

1. Create `figma_migration/<theme-name>-<YYYY-MM-DD>/` folder with `screenshots/` and `design-data/` subfolders
2. Call `get_figma_data` on the **root file URL** to get ALL top-level frames
3. Log every frame by name, node ID, and dimensions — print total count
4. For EACH frame, call `download_figma_images` to save screenshots
   - **Wait 3 seconds between each download** to avoid rate limits
   - On 429/rate limit error: wait 30s → retry → wait 60s → retry → log failure
5. Save `frames.json` with frame names, node IDs, dimensions, Figma node URLs, and screenshot paths
6. **Verify**: count screenshots vs frame count — retry any missing

**This phase is simplified** — vibe_figma handles detailed data extraction in Phase 2b. Phase 1 only needs screenshots (for testing) and frame metadata (for classification).

**NEVER skip any frame's screenshot.** If rate limited, follow the "Figma Rate Limit Policy" above — wait and retry, notify user if stuck. Do NOT proceed to Phase 2 with missing screenshots.

---

### Phase 2: Design Analysis & Page Mapping
**Prompt:** `prompts/02-analyze-design.md`

1. Read ALL screenshots visually using the Read tool
2. **Classify every frame** into categories:
   - **A: Actual pages** — full web page layouts (header + content + footer, standard dimensions)
   - **B: Responsive variants** — mobile/tablet versions of Category A pages
   - **C: Component sheets** — isolated UI components, style guides, design tokens (USE as reference, don't convert)
   - **D: Annotations/notes** — text notes, developer instructions, TODOs, changelogs (EXCLUDE completely)
   - **E: Misc/decorative** — mood boards, old versions ("v1", "backup"), presentation slides (EXCLUDE completely)
3. From Category A only: identify shared components (header, footer, sidebar, lang switcher)
4. From Category A only: identify distinct pages — group with their Category B variants
5. Identify sections within each page (hero, features, testimonials, etc.)
6. **Record the Figma node URL for each Category A page** — needed for vibe_figma in Phase 2b
7. Create `$MIGRATION_DIR/design-map.md` with:
   - **Frame classification table** (every frame categorized with reason)
   - **Page list with Figma node URLs** (for vibe_figma input)
   - Shared component descriptions
   - **Page list with suggested slugs** (driven entirely by Category A frames)
   - Excluded frames list (with useful info noted)
   - Color palette and font identification
   - Complete file plan (which `.astro` and `.tsx` files to create)

**CRITICAL: Figma files contain noise** — annotation text boxes, component libraries, sticky notes, old versions. Only Category A frames become pages. Record the exact Figma URL (with node-id) for each page.

---

### Phase 2b: Generate React Code with vibe_figma
**Prompt:** `prompts/02b-vibefigma-codegen.md`

For EACH Category A page identified in Phase 2:

1. Build the Figma node URL: `https://www.figma.com/design/<file-id>/<file-name>?node-id=<node-id>`
2. Run vibe_figma:
   ```bash
   npx vibefigma "<figma-node-url>" --token $FIGMA_TOKEN \
     -c $MIGRATION_DIR/vibe-output/<page-slug>/ \
     -a $MIGRATION_DIR/vibe-output/<page-slug>/assets \
     --force
   ```
3. **Wait 5 seconds between each page** to avoid Figma rate limits
4. Verify output: check that `.tsx` file(s) and assets were generated
5. After all pages: collect all assets from vibe-output into `themes/<theme-name>/assets/`

**vibe_figma generates pixel-accurate React + Tailwind code.** This code is the STARTING POINT for theme conversion — it gets the visual accuracy right. Phase 4 then adapts it to the CMS theme system.

**What vibe_figma handles well:**
- Exact colors, fonts, spacing, borders, shadows
- Actual images and icons extracted as assets
- Tailwind CSS classes matching the design
- Layout structure (flex, grid, positioning)

**What vibe_figma does NOT handle (Phase 4 adapts these):**
- CMS data integration (WebsiteDataProvider, ContentRenderer, pageData)
- Dynamic menus from CMS (Menu.tsx with CMS fallback)
- Language switching (useLanguage hook)
- Mobile hamburger menu (interactive state)
- Blog list/post templates (dynamic data)
- Astro SSR routing (.astro entry points)
- Theme system conventions (imports, providers, layout patterns)

**NEVER skip a page's vibe_figma generation.** If rate limited, follow the "Figma Rate Limit Policy" above — wait and retry, notify user if stuck. Do NOT proceed to Phase 3 with missing vibe_figma output. Every page needs its generated code for visual accuracy.

---

### Phase 3: Create Theme Skeleton
**Prompt:** `prompts/03-create-theme-skeleton.md`

1. `cp -r themes/interlinked themes/<theme-name>`
2. Update `package.json` name to `@themes/<theme-name>`
3. Create `.astro` entry points for each page in the design map:
   - Required: `Index.astro`, `Blog.astro`, `single-blog.astro`, `404.astro`
   - Per-design page: `<slug>.astro` for each distinct page found in Figma
4. Create component shells in `components/` for each planned component
5. Copy all assets from `$MIGRATION_DIR/vibe-output/*/assets/` to `themes/<theme-name>/assets/`
6. Verify file structure matches design-map.md

**Per-page `.astro` files auto-register** via `theme_imports.py` and match by slug in `getThemeComponent.ts`. Creating `about.astro` automatically creates a route for the `/about` page.

---

### Phase 4: Convert Components (from vibe_figma output → CMS theme)
**MANDATORY references** (read BEFORE any component work):
- `prompts/16-responsive-rules.md` — responsive patterns
- `$MIGRATION_DIR/vibe-output/` — vibe_figma generated code (pixel-accurate starting point)
- `$MIGRATION_DIR/screenshots/` — visual reference
- `$MIGRATION_DIR/design-map.md` — page/component mapping

**KEY PRINCIPLE: Transform code, don't rebuild.** The correct approach is to COPY code from vibe_figma output, then EDIT it to add CMS integration. Never write JSX from scratch — that causes missing styles and visual drift.

**Transform process per component:**
1. Find the corresponding section in vibe_figma output
2. **Copy the entire JSX block** (with all its Tailwind classes)
3. **Edit** the copied code to add CMS features:
   - Wrap in `WebsiteDataProvider`
   - Replace hardcoded nav with `Menu.tsx` (CMS menu integration)
   - Replace static content areas with `ContentRenderer` for CMS-managed pages
   - Add `useLanguage` hook for language switching
   - Add mobile hamburger menu with interactive state
   - Split monolithic output into proper component files (Header, Footer, Menu, etc.)
   - Use CMS import patterns (`@deepsel/cms-react`, `@deepsel/cms-utils`)
4. **Verify** the Tailwind classes survived the transformation — they should be identical to vibe_figma

**MUST preserve from vibe_figma code (never change these):**
- Exact Tailwind classes (colors, spacing, fonts, borders, shadows)
- Layout structure (flex/grid patterns, positioning)
- Asset references (images, icons, SVGs)
- Arbitrary values (`text-[#4A4A68]`, `px-[72px]`, `gap-[32px]`)
- Text content from the design

Convert components in this order, reading the prompt file for each:

| Step | Prompt File | Component |
|------|------------|-----------|
| 4a | `prompts/04-convert-layout.md` | `Page.tsx` — layout shell with slug-based page dispatch |
| 4b | `prompts/05-convert-header.md` | Header (inside Page.tsx or standalone) |
| 4c | `prompts/06-convert-menu.md` | `Menu.tsx` — desktop nav + mobile hamburger |
| 4d | `prompts/07-convert-footer.md` | `Footer.tsx` — footer content |
| 4e | `prompts/08-convert-hero.md` | Hero/banner sections |
| 4f | `prompts/09-convert-page-sections.md` | Generic sections (features, testimonials, etc.) |
| 4g | `prompts/10-convert-blog.md` | `BlogList.tsx` + `BlogPost.tsx` |
| 4h | `prompts/11-convert-custom-pages.md` | Per-design page components (`Page<Name>.tsx`) |
| 4i | `prompts/12-convert-sidebar.md` | `Sidebar.tsx` (only if design has sidebar) |
| 4j | `prompts/13-convert-lang-switcher.md` | `LangSwitcher.tsx` |

#### Key Patterns Across All Components

**Hardcoded design menus (Menu.tsx):**
```tsx
// Default menu items from Figma — replaced by CMS menus when available
const designMenuItems: MenuItem[] = [
  // Extract actual items visible in the Figma design
];
const menus = websiteData?.settings?.menus?.length
  ? websiteData.settings.menus
  : designMenuItems;
```

**Slug-based page dispatch (Page.tsx):**
```tsx
// Map of slugs to page components — driven by design-map.md
const pageComponents: Record<string, React.FC> = {
  // Only include pages that exist in the Figma design
};
const slug = pageData.slug?.replace(/^\//, '') || '';
const PageContent = pageComponents[slug];
// Render PageContent if found, otherwise ContentRenderer
```

**WebsiteDataProvider wrapper (every page component):**
```tsx
<WebsiteDataProvider pageData={pageData} languageAlternatives={pageData.language_alternatives}>
  {/* layout */}
</WebsiteDataProvider>
```

#### Critical Conversion Rules

Read [figma-conversion-guide.md](figma-conversion-guide.md) for complete mapping tables. Key rules:

1. **Preserve vibe_figma Tailwind classes** — they match the Figma design exactly
2. **NEVER nest divs excessively** — max 5 levels, use semantic HTML
3. **ALWAYS mobile-first** — base = mobile, add `md:` / `lg:` for larger
4. **Handle auto layout** — Fill = `flex-1`, Hug = `w-fit`, Fixed = nearest `w-*`
5. **Infer responsive** — compare desktop/mobile Figma frames for breakpoint behavior
6. **Add accessibility** — alt text, aria-labels, heading hierarchy, focus states
7. **Manage z-index** — header `z-40`, dropdowns `z-20`, modals `z-50`

#### Import Rules
```tsx
import { WebsiteDataTypes, type PageData, type BlogListData, type BlogPostData } from "@deepsel/cms-utils";
import { isActiveMenu, type MenuItem } from "@deepsel/cms-utils";
import { WebsiteDataProvider, ContentRenderer, useWebsiteData } from "@deepsel/cms-react";
import { useLanguage } from "@deepsel/cms-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Pagination, MantineProvider } from '@mantine/core';
```

---

### Phase 4 Validation: React Best Practices Review

After all components are converted, invoke the `vercel-react-best-practices` skill to review the React code:

```
/vercel-react-best-practices
```

Review all `.tsx` files in `themes/<name>/components/` for:
- Unnecessary re-renders (missing memoization for expensive computations)
- Incorrect hook usage patterns
- Performance anti-patterns (inline object/function creation in JSX)
- Bundle size concerns (unused imports, large dependencies)

Apply any critical fixes before proceeding. Skip cosmetic suggestions that don't affect functionality.

---

### Phase 5: UI Re-verification Against vibe_figma (Code Review)
**Prompt:** `prompts/05b-reverify-ui.md`

**This is the most important quality gate.** During Phase 4, adapting vibe_figma code into CMS components often introduces visual drift — wrong colors, lost spacing, missing borders, simplified classes. This phase is a **pure code review** — no screenshots, no deployment needed.

**KEY PRINCIPLE: Transform, don't rebuild.** Phase 4 should transform code by copying from vibe_figma and editing (adding CMS wrappers). Never rebuild JSX from scratch — that causes missing styles. This phase verifies the transformation was faithful.

1. For EACH theme component, read the vibe_figma output and theme code
2. Compare **every JSX element's Tailwind classes** — not visual impression, but actual code
3. Use parallel subagents (one per page) to speed up comparison:
   ```
   Spawn Task agents (subagent_type="general-purpose"):
   - Agent 1: Compare Header/Footer/Menu against vibe_figma homepage
   - Agent 2: Compare PageHome sections against vibe_figma homepage sections
   - Agent 3: Compare PageAbout against vibe_figma about output
   ```
4. Fix every drift by **copying the exact classes from vibe_figma** — never guess
5. Save drift report to `$MIGRATION_DIR/ui-verification-report.md`

**Common drifts to catch:** `text-gray-600` should be `text-[#4A4A68]`, `px-6` should be `px-16`, `rounded-lg` should be `rounded-md`, missing `border-b`, missing `font-medium`, etc.

---

### Phase 6: Colors & Fonts
**Prompt:** `prompts/14-colors-and-fonts.md`

1. Extract primary color from vibe_figma output (look at button/accent colors in generated code)
2. Generate 50-900 color scale and update CSS variables in `themes/<name>/main.css`
3. Identify heading and body fonts from vibe_figma output
4. Update Google Fonts `<link>` in ALL `.astro` files
5. Update `tailwind.config.js` font family if needed

---

### Phase 7: Register & Deploy
**Prompt:** `prompts/15-register-and-deploy.md`

1. Update `client/src/themes.ts` (between auto-managed markers):
   - Import all `.astro` files (required 4 + any custom page `.astro` files)
   - Add theme map entry with all routes including custom page slugs
2. Activate theme in database:
   ```bash
   PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -c "UPDATE organization SET selected_theme = '<theme-name>' WHERE id = (SELECT id FROM organization LIMIT 1);"
   ```
3. `npm install` at project root
4. `npm run build` — fix any build errors
5. `npm run dev` — verify theme renders

**Theme map with custom pages example:**
```typescript
'<theme-name>': {
  [themeSystemKeys.Page]: ThemeIndex,
  [themeSystemKeys.BlogList]: ThemeBlog,
  [themeSystemKeys.BlogPost]: ThemeSingleBlog,
  [themeSystemKeys.NotFound]: Theme404,
  'about': ThemeAbout,        // Custom .astro per design page
  'services': ThemeServices,  // Auto-matches /services slug
},
```

---

### Phase 8: Test & Iterate

Invoke the test-theme skill:
```
/test-theme <theme-name>
```

This will:
1. Discover all pages from the database
2. For EACH page (one at a time): take screenshots at 3 viewports, test interactive elements (menu clicks, button clicks, mobile hamburger), check console errors, verify links
3. Compare screenshots against Figma references
4. Generate a full test report with visual + interaction results
5. Fix issues and re-test until all pages pass

---

## File Checklist

Before declaring the theme complete, verify ALL required files exist:

**Required (always):**
- [ ] `themes/<name>/Index.astro`
- [ ] `themes/<name>/Blog.astro`
- [ ] `themes/<name>/single-blog.astro`
- [ ] `themes/<name>/404.astro`
- [ ] `themes/<name>/components/Page.tsx`
- [ ] `themes/<name>/components/BlogList.tsx`
- [ ] `themes/<name>/components/BlogPost.tsx`
- [ ] `themes/<name>/components/Menu.tsx`
- [ ] `themes/<name>/components/Footer.tsx`
- [ ] `themes/<name>/components/LangSwitcher.tsx`
- [ ] `themes/<name>/main.css` (with updated color variables)
- [ ] `themes/<name>/tailwind.config.js`
- [ ] `themes/<name>/postcss.config.js`
- [ ] `themes/<name>/tsconfig.json`
- [ ] `themes/<name>/env.d.ts`
- [ ] `themes/<name>/package.json`
- [ ] Theme registered in `client/src/themes.ts`

**Conditional (based on Figma design):**
- [ ] `themes/<name>/components/Sidebar.tsx` (if sidebar in design)
- [ ] `themes/<name>/<slug>.astro` (for each custom page in design)
- [ ] `themes/<name>/components/Page<Name>.tsx` (for each custom page)
- [ ] `themes/<name>/assets/images/*` (extracted by vibe_figma from design)
- [ ] Shared section components (Hero.tsx, etc.) if used across pages
