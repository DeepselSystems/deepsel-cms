# Step: Element-Level Comparison and Fix

## Goal
Compare Playwright screenshots against Figma design references at the ELEMENT level — not just overall impression. Map each React component's DOM output to the corresponding Figma element and verify every property matches.

## Why Element-Level Comparison

The old approach ("does this page generally look like the design?") produces 50-60% matches. To achieve 95%+ accuracy, we must:
1. Break each page into individual React components
2. For each component, identify its DOM output
3. Map each DOM element to the corresponding Figma element
4. Compare EXACT properties: background color, font, spacing, border, images, icons

## Comparison Process

### Step 1: Read source code + design tokens + both screenshots

For each page, load:
1. The Figma screenshot (`$MIGRATION_DIR/screenshots/`)
2. The test screenshot (`$MIGRATION_DIR/test-results/run-NNN/`)
3. The theme's React component source code (`themes/<name>/components/`)
4. The design tokens (`$MIGRATION_DIR/design-tokens.md`)

### Step 2: Compare component by component

For EACH React component on the page, do this comparison:

```markdown
## Component: Header
Source: themes/<name>/components/Page.tsx lines 15-35

### Element: Header container
- Token: bg #FFFFFF, h 80px, border-b 1px #E5E7EB
- Code: bg-white h-20 border-b border-[#E5E7EB]
- Figma screenshot: ✓ white background, thin bottom border
- Test screenshot: ✗ DARK NAVY background — WRONG
- Fix: Change bg-slate-900 → bg-white in Page.tsx:16

### Element: Logo text
- Token: "alcoris." Inter 20px bold #1A1A2E
- Code: text-xl font-bold text-[#1A1A2E]
- Figma screenshot: ✓ dark text on white
- Test screenshot: ✗ white text on dark bg (consequence of wrong header bg)
- Fix: will be fixed when header bg is fixed

### Element: Menu links
- Token: Inter 14px medium #4A4A68, gap 32px
- Code: text-sm font-medium text-gray-700 gap-6
- Figma screenshot: ✓ medium gray links, well-spaced
- Test screenshot: ✗ wrong gap (gap-6=24px, should be gap-8=32px), wrong color (#4A4A68 ≠ gray-700)
- Fix: Change text-gray-700 → text-[#4A4A68], gap-6 → gap-8 in Menu.tsx:12

### Element: "Kontakt" button
- Token: bg #2563EB, text white 14px medium, px 24px py 10px, rounded 6px
- Code: bg-primary-600 text-white text-sm px-4 py-2 rounded-lg
- Figma screenshot: ✓ blue rounded button
- Test screenshot: ✗ wrong border-radius (rounded-lg=8px, should be rounded-md=6px), wrong padding
- Fix: Change rounded-lg → rounded-md, px-4 → px-6, py-2 → py-2.5 in Page.tsx:28
```

### Step 3: Repeat for EVERY component on the page

Go through the entire page top to bottom:
1. **Header** — logo, nav links, CTA button, background, border
2. **Hero** — background (image/color), overlay, headline, subtitle, CTA, positioning
3. **Each content section** — background, heading, subtitle, grid layout, cards, icons, photos, text content
4. **Footer** — background, layout, logo, form, contact info, copyright, links
5. **Overall** — font family loading, max-width container, page background

### Step 4: Check for missing/extra elements

| Check | How to verify |
|-------|--------------|
| Missing images | Figma has photo → test shows gray box or nothing |
| Missing icons | Figma has custom icon → test has FontAwesome or nothing |
| Missing background image | Figma hero has bg image → test has solid color |
| Extra elements | Test has elements not in Figma (e.g., social icons in footer when Figma has none) |
| Wrong text content | Figma says "Kontakt" → test says "Contact" |
| Wrong section order | Figma: Hero → About → Features → CTA → Footer. Test: different order |

### Step 5: Prioritize fixes

**Priority 1: Wrong colors/backgrounds** — Most visually impactful
- Header/footer background color wrong
- Section background colors wrong
- Button/link colors wrong

**Priority 2: Missing assets** — Immediately noticeable
- Photos showing as placeholders
- Icons missing or replaced with FontAwesome
- Background images missing

**Priority 3: Wrong layout/spacing** — Affects overall feel
- Wrong flex direction or grid columns
- Wrong padding/gap values
- Wrong container width

**Priority 4: Wrong typography** — Subtle but important
- Wrong font family (Google Fonts link missing?)
- Wrong font size/weight
- Wrong text color

**Priority 5: Wrong element details** — Fine-tuning
- Wrong border-radius
- Wrong border color/width
- Wrong shadow
- Wrong hover/active states

## Test Report Format (Element-Level)

```markdown
# Element-Level Test Report: <theme-name>
Run: NNN | Date: YYYY-MM-DD | Iteration: N

## Page: Homepage

### Header (Page.tsx:15-35)
| Element | Token Value | Code Value | Match? | Fix |
|---------|------------|------------|--------|-----|
| Container bg | #FFFFFF | bg-slate-900 | ✗ | → bg-white |
| Container height | 80px | h-16 | ✗ | → h-20 |
| Container border | 1px #E5E7EB | none | ✗ | → add border-b border-[#E5E7EB] |
| Logo text | Inter 20px bold #1A1A2E | text-xl font-bold text-white | ✗ | → text-[#1A1A2E] |
| Menu link font | 14px medium #4A4A68 | text-sm text-gray-300 | ✗ | → text-[#4A4A68] |
| Menu link gap | 32px | gap-6 | ✗ | → gap-8 |
| Button bg | #2563EB | bg-blue-500 | ✗ | → bg-[#2563EB] |
| Button radius | 6px | rounded-lg (8px) | ✗ | → rounded-md |
**Header score: 1/8 elements match = 12.5%**

### Hero (PageHome.tsx:5-40)
| Element | Token Value | Code Value | Match? | Fix |
|---------|------------|------------|--------|-----|
| Background | hero-bg.jpg + overlay | bg-[#0F172A] solid | ✗ | → add img + overlay |
| Overlay opacity | 70% | none | ✗ | → bg-[#0F172A]/70 |
| Headline font | 56px bold white | text-4xl | ✗ | → text-[56px] |
| Headline text | "Alcoris Treuhand" | "Alcoris Treuhand" | ✓ | |
| Subtitle | 16px #CBD5E1 | text-lg text-gray-300 | ✗ | → text-base text-[#CBD5E1] |
**Hero score: 1/5 elements match = 20%**

### Section: "Ihre Vorteile" (PageHome.tsx:60-100)
| Element | Token Value | Code Value | Match? | Fix |
|---------|------------|------------|--------|-----|
| Section bg | #F1F5F9 | bg-gray-100 | ~close | → bg-[#F1F5F9] |
| Icons | custom SVG from assets | FontAwesome | ✗ | → import actual SVGs |
| Icon color | original SVG colors | blue-500 | ✗ | → use original SVG |
**Section score: 0/3 critical elements match = 0%**

## Overall Page Score
- Elements checked: 30
- Elements matching: 5
- Match rate: 16.7%
- Target: ≥ 95%

## Fix List (ordered by priority)
1. [P1-COLOR] Header bg: bg-slate-900 → bg-white (Page.tsx:16)
2. [P1-COLOR] Footer bg: bg-slate-900 → bg-white (Footer.tsx:3)
3. [P2-ASSET] Hero background: add hero-bg.jpg import + img element (PageHome.tsx:8)
4. [P2-ASSET] Ihre Vorteile icons: replace FontAwesome with actual SVGs (PageHome.tsx:65-80)
5. [P2-ASSET] Team photos: replace placeholders with actual photos (PageHome.tsx:45-55)
6. [P3-SPACING] Header height: h-16 → h-20 (Page.tsx:16)
7. [P3-SPACING] Menu gap: gap-6 → gap-8 (Menu.tsx:12)
...
```

## Iteration Rules
- Max 10 iterations per test run
- After each iteration, create new screenshots in the SAME run directory (overwrite)
- Update the test report with new element-level scores
- Stop iterating when overall match rate ≥ 95% (not just "looks similar")
- If still below 95% after 10 iterations, generate final report with remaining issues and stop
- Each iteration should fix at least 3-5 elements; if stuck, escalate to user

## Fix Process Per Iteration
1. Read the fix list from the report
2. Apply ALL P1 (color) fixes first — these cascade (fixing header bg fixes logo + link colors too)
3. Apply ALL P2 (asset) fixes — import actual images, replace FontAwesome
4. Wait for hot-reload (3 seconds)
5. Re-take screenshots for the affected page
6. Re-run element-level comparison
7. Generate updated report with new scores
8. Move to P3/P4/P5 fixes in subsequent iterations
