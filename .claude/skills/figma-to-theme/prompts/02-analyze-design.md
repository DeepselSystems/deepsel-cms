# Phase 2: Design Analysis & Page Mapping

## Goal
Visually analyze ALL extracted screenshots, filter out non-page content (notes, annotations, component libraries), and create a mapping document that drives the rest of the conversion.

## Input: Data from Phase 1

This phase reads from the migration folder — **no Figma API calls needed**:
- `$MIGRATION_DIR/screenshots/` — visual screenshots of every frame
- `$MIGRATION_DIR/design-data/frames.json` — frame index with names, dimensions, and **Figma node URLs**

## Process

### Step 1: Read all screenshots + frame metadata
Use the Read tool to visually examine every screenshot in `$MIGRATION_DIR/screenshots/`.
Also read `$MIGRATION_DIR/design-data/frames.json` for frame dimensions, names, and **Figma node URLs** to assist classification.

### Step 2: Classify each frame — FILTER OUT NON-PAGE CONTENT

**CRITICAL: Figma files often contain frames that are NOT actual pages.** Before mapping, classify every frame into one of these categories:

#### Category A: Actual Pages (INCLUDE)
These are full page designs meant to be converted:
- Full-width layouts with header, content area, and footer
- Recognizable page structure (navigation, hero, sections, etc.)
- Standard web page dimensions (width: 1280-1920px for desktop, 320-430px for mobile, 768px for tablet)
- Named with page-like names: "Home", "About", "Landing", "Blog", "Contact", etc.

#### Category B: Responsive Variants (INCLUDE — map to parent page)
- Same content as a Category A page but at different viewport size
- Named with size indicators: "Mobile", "Tablet", "375", "768", etc.
- Similar elements/sections as the desktop version

#### Category C: Component Sheets (EXCLUDE from pages, USE as reference)
- Isolated UI components (buttons, cards, inputs, icons)
- Style guides / design tokens
- Component libraries or pattern sheets
- Named: "Components", "UI Kit", "Design System", "Atoms", "Molecules"

#### Category D: Annotations & Notes (EXCLUDE completely)
- Text boxes with design notes, developer handoff instructions
- Sticky notes, comments, TODO lists
- Changelogs or version notes
- Small frames with just text (no visual design structure)
- Frames with names like: "Notes", "TODO", "Feedback", "Instructions", "Readme", "Changelog"

#### Category E: Decorative / Misc (EXCLUDE completely)
- Presentation covers or title slides
- Mood boards, inspiration images
- Frames that are clearly not web pages (odd dimensions, no structure)
- Duplicate/old versions of pages (look for "v1", "old", "backup", "archive" in names)

**Create a classification table in the design map:**
```markdown
## Frame Classification
| Frame Name | Dimensions | Category | Action |
|------------|-----------|----------|--------|
| Homepage Desktop | 1440x900 | A: Page | Convert → Page component |
| Homepage Mobile | 375x812 | B: Variant | Map to Homepage responsive |
| About Us | 1440x1200 | A: Page | Convert → PageAbout component |
| UI Components | 800x2000 | C: Components | Reference only |
| Dev Notes | 400x300 | D: Notes | Skip |
| Color Palette | 600x400 | C: Components | Reference for colors |
| Landing v1 (old) | 1440x900 | E: Misc | Skip (outdated) |
```

### Step 3: Identify shared components
From Category A pages, look for elements that appear across multiple frames:
- **Header/Navigation bar** — consistent top bar across pages
- **Footer** — consistent bottom section across pages
- **Sidebar** — if present on multiple pages
- **Language switcher** — if present

Also check Category C (component sheets) for detailed component specs that can inform the conversion.

### Step 4: Identify distinct pages
Group Category A frames by the page they represent. A "page" is a distinct content layout:
- Look at frame names for clues (e.g., "Home", "About", "Services", "Blog")
- Group desktop + mobile + tablet variants (Category B) of the same page together
- Each unique page layout needs its own component
- **If two frames look like the same page at different breakpoints, they are ONE page, not two**

### Step 5: Identify page sections
Within each page, identify distinct sections:
- Hero/banner areas
- Content blocks (features, testimonials, pricing, stats, CTA, etc.)
- Forms
- Tables/data displays
- Any unique section specific to that page

### Step 6: Create design-map.md

Write `$MIGRATION_DIR/design-map.md` with this structure:

```markdown
# Design Map

## Frame Classification
| Frame Name | Dimensions | Category | Action |
|------------|-----------|----------|--------|
| (frame name) | WxH | A/B/C/D/E | Convert/Map/Reference/Skip |

**Summary:** X total frames → Y actual pages, Z responsive variants, W excluded

## Shared Components
### Header
- Description: (what it looks like)
- Variants: (sticky? transparent? changes on scroll?)
- Screenshot: (filename)

### Footer
- Description: (what it looks like)
- Screenshot: (filename)

### Menu
- Desktop: (horizontal nav? dropdown?)
- Mobile: (hamburger? slide-out? bottom nav?)
- Menu items found in design: (list the actual nav items visible)

### Sidebar (if present)
- Description: ...

### Language Switcher (if present)
- Description: ...

## Pages
### Page: (page-name)
- Figma frames: (list desktop/mobile/tablet frames)
- **Figma URL (desktop)**: `https://www.figma.com/design/<file-id>/<name>?node-id=<node-id>` ← for vibe_figma
- Slug suggestion: (kebab-case, e.g., "home", "about", "services")
- Sections:
  1. (section name) — (description)
  2. (section name) — (description)
- Unique elements: (anything not in other pages)

(repeat for each page discovered)

**IMPORTANT:** The Figma URL for each page is critical — Phase 2b uses it to run vibe_figma. Get the URL from `frames.json` (the `figmaUrl` field for the Category A desktop frame).

## Excluded Frames
List all Category C/D/E frames and why they were excluded.
Note any useful info from excluded frames (e.g., color palette from a style guide frame).

## Theme File Plan
### Astro Entry Points
- Index.astro (required, generic fallback)
- Blog.astro (required)
- single-blog.astro (required)
- 404.astro (required)
- (slug).astro — for each distinct page found in design

### React Components
- Page.tsx (required, generic fallback with ContentRenderer)
- BlogList.tsx (required)
- BlogPost.tsx (required)
- Menu.tsx (required)
- Footer.tsx (required)
- LangSwitcher.tsx (required)
- Sidebar.tsx (if sidebar found in design)
- Page(Name).tsx — for each distinct page found in design
- (Section).tsx — for reusable sections found across pages

### Color Palette
- Primary: #hex (from most prominent brand color)
- Secondary: #hex (if found)
- Background: #hex
- Text: #hex
- Accent colors: ...

### Fonts
- Heading font: (name, weights used)
- Body font: (name, weights used)
```

## Rules
- The page list is 100% driven by the Figma design — do NOT assume pages like "contact" or "finance" exist
- If the design only has 1 page, only create the generic `Page.tsx` with no custom page components
- If the design has 5 distinct pages, create 5 custom page components + their `.astro` files
- Mobile frames are NOT separate pages — they map to responsive variants of desktop frames
- Menu items should be extracted from what's visible in the design
- If you can't determine a slug from the design, suggest one and note it's a suggestion
- **ALWAYS classify frames before mapping** — do not treat annotation frames or component sheets as pages
- **When in doubt about a frame's category, read the screenshot visually** — if it looks like a full web page with header/content/footer, it's Category A. If it's just text or isolated elements, it's C/D/E.
- **Check for duplicates** — Figma files often have old versions of pages. If two frames look nearly identical, keep the one that appears more final (higher fidelity, more complete, or later in the frame list)

## Output
- `$MIGRATION_DIR/design-map.md` — the complete mapping document with classification
- This document drives ALL subsequent phases
- Only Category A pages (and their Category B variants) become theme files
