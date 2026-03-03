# Phase 5: UI Re-verification Against vibe_figma Output (Code Review)

## Goal
After Phase 4 converts vibe_figma output into CMS theme components, this phase verifies that the visual accuracy was preserved **at the code level**. This is a CODE REVIEW process — no screenshots, no deployment needed. Compare Tailwind classes in theme code against vibe_figma source code, find drifts, and fix them.

## Why This Phase Exists
Phase 4 adapts vibe_figma's pixel-perfect static code into dynamic CMS components. During this adaptation, common accuracy losses include:
- Tailwind classes simplified or replaced with generic ones (e.g., `bg-[#2563EB]` → `bg-blue-500`)
- Layout structure changed when splitting monolithic component into Header/Footer/Menu
- Spacing/padding lost when wrapping content in new containers
- Font styles changed or missing after restructuring
- Asset imports broken or paths wrong after file reorganization
- Section backgrounds or borders dropped during component extraction

## CRITICAL PRINCIPLE: Transform, Don't Rebuild

**The correct approach to Phase 4 conversion is to TRANSFORM code — find the relevant section in vibe_figma output, copy it, then edit to add CMS integration.** Never rebuild JSX from scratch.

When checking in this phase, ask: "Was this code transformed from vibe_figma (keeping styles), or was it rewritten (losing styles)?"

Signs of **correct transformation** (keep):
- Tailwind classes match vibe_figma exactly
- HTML structure is similar, with CMS wrappers added around it
- Arbitrary values preserved: `text-[#4A4A68]`, `px-[72px]`, `gap-[32px]`

Signs of **incorrect rebuild** (fix):
- Generic Tailwind classes replacing specific ones: `text-gray-600` instead of `text-[#4A4A68]`
- Simplified spacing: `px-6` instead of `px-16`, `py-3` instead of `py-4`
- Missing decorative classes: borders, shadows, rounded corners dropped
- Different HTML structure that doesn't match vibe_figma at all
- Font weights/sizes changed: missing `font-medium`, `text-4xl` instead of `text-[56px]`

**When a drift is found, the fix is to go back to vibe_figma, copy the original classes, and paste them into the theme code.** Do NOT guess what the classes should be.

## Process — Per Component, Per Page

### Step 1: Build comparison list

From `$MIGRATION_DIR/design-map.md`, list every page and its shared components:
```
Components to verify:
1. Page.tsx (layout shell) — compare against all vibe_figma pages (shared header/footer)
2. Menu.tsx — compare against header nav section in vibe_figma homepage
3. Footer.tsx — compare against footer section in vibe_figma homepage
4. PageHome sections — compare against vibe_figma homepage body sections
5. PageAbout sections — compare against vibe_figma about page body sections
... (every page component)
```

### Step 2: For EACH component — side-by-side code comparison

Read the vibe_figma output and the theme component. Compare **every JSX element**:

#### Compare process per element:
1. Find the element in vibe_figma output (e.g., the header container `<div>`)
2. Note its exact Tailwind classes: `className="flex items-center justify-between px-16 py-4 bg-white border-b border-[#E5E7EB]"`
3. Find the **same element** in the theme component
4. Compare classes — are they identical? If not, what changed?
5. Log any drift:

```markdown
### Component: Header (Page.tsx)

| Element | vibe_figma classes | Theme classes | Match? | Fix |
|---------|-------------------|---------------|--------|-----|
| Header container | `flex items-center justify-between px-16 py-4 bg-white border-b border-[#E5E7EB]` | `flex items-center justify-between px-6 py-3 bg-white` | ✗ | Copy from vibe_figma: px-6→px-16, py-3→py-4, add border-b border-[#E5E7EB] |
| Logo text | `text-xl font-bold text-[#1A1A2E]` | `text-xl font-bold text-gray-900` | ✗ | Copy from vibe_figma: text-gray-900→text-[#1A1A2E] |
| Nav link | `text-sm font-medium text-[#4A4A68]` | `text-sm text-gray-600` | ✗ | Copy from vibe_figma: add font-medium, text-gray-600→text-[#4A4A68] |
| CTA button | `bg-[#2563EB] text-white text-sm font-medium px-6 py-2.5 rounded-md` | `bg-primary-600 text-white text-sm px-4 py-2 rounded-lg` | ✗ | Copy from vibe_figma: bg-primary-600→bg-[#2563EB], px-4→px-6, py-2→py-2.5, rounded-lg→rounded-md |
```

### Step 3: Use subagents for parallel page comparison

Spawn parallel Task subagents, one per page:

```
Use Task tool with subagent_type="general-purpose":
- Agent 1: "Compare Header/Footer/Menu in theme against vibe_figma homepage output.
  Read: $MIGRATION_DIR/vibe-output/homepage/<Component>.tsx
  Read: themes/<name>/components/Page.tsx, Menu.tsx, Footer.tsx
  For each JSX element, compare Tailwind classes. Return a markdown table of drifts.
  IMPORTANT: When reporting drifts, always include the exact vibe_figma classes to copy."

- Agent 2: "Compare PageHome sections against vibe_figma homepage output.
  Read: $MIGRATION_DIR/vibe-output/homepage/<Component>.tsx (sections after header, before footer)
  Read: themes/<name>/components/PageHome.tsx (or sections in Page.tsx)
  For each JSX element, compare Tailwind classes. Return a markdown table of drifts."

- Agent 3: "Compare PageAbout against vibe_figma about output.
  Read: $MIGRATION_DIR/vibe-output/about/<Component>.tsx
  Read: themes/<name>/components/PageAbout.tsx
  For each JSX element, compare Tailwind classes. Return a markdown table of drifts."
```

Each agent returns a structured table of element drifts.

### Step 4: Apply ALL fixes

After collecting drift tables from all agents, fix every drift in the main conversation:

**Fix method — ALWAYS copy from vibe_figma:**
1. Open the vibe_figma `.tsx` file
2. Find the element with the correct classes
3. Copy the exact `className` string
4. Paste into the theme component, preserving any CMS additions (onClick, dynamic content, etc.)

**Fix rules:**
1. **Always use the vibe_figma Tailwind class** — it's pixel-accurate from Figma
2. **If the theme uses a CSS variable (e.g., `bg-primary-600`) where vibe_figma uses `bg-[#2563EB]`**, keep the theme's CSS variable ONLY if `main.css` maps it to the exact same color. Otherwise, use the vibe_figma arbitrary value.
3. **If the theme restructured HTML** (e.g., wrapped in extra divs for CMS), ensure the visual-affecting classes are still on the correct element
4. **Do NOT remove CMS-specific additions** (WebsiteDataProvider, onClick handlers, dynamic menu) — only fix visual classes
5. **Asset paths**: verify all `import` paths still resolve after file reorganization
6. **When in doubt, copy more from vibe_figma rather than less** — it's easier to remove a class later than to figure out a missing one

### Step 5: Generate drift report

Save `$MIGRATION_DIR/ui-verification-report.md`:

```markdown
# UI Re-verification Report (Code Review)

## Summary
- Components checked: X
- Elements compared: Y
- Drifts found: Z
- Drifts fixed: Z
- Remaining issues: 0

## Method
Code-level comparison of Tailwind classes between vibe_figma output and theme components.
All fixes applied by copying exact classes from vibe_figma source.

## Per-Component Results
### Header (Page.tsx)
- Elements: 8 | Drifts: 3 | Fixed: 3 ✓

### Footer (Footer.tsx)
- Elements: 12 | Drifts: 5 | Fixed: 5 ✓

### PageHome sections
- Elements: 25 | Drifts: 8 | Fixed: 8 ✓

(etc.)
```

## Common Drift Patterns to Watch

| Pattern | vibe_figma (correct) | Common drift (wrong) | Fix |
|---------|---------------------|---------------------|-----|
| Exact hex color | `text-[#4A4A68]` | `text-gray-600` | Copy vibe_figma value |
| Exact padding | `px-16 py-4` | `px-6 py-3` | Copy vibe_figma value |
| Border radius | `rounded-md` (6px) | `rounded-lg` (8px) | Copy vibe_figma value |
| Font weight | `font-medium` | missing | Copy from vibe_figma |
| Border | `border-b border-[#E5E7EB]` | missing | Copy from vibe_figma |
| Shadow | `shadow-sm` | missing | Copy from vibe_figma |
| Max width | `max-w-7xl` | `max-w-6xl` | Copy vibe_figma value |
| Gap | `gap-8` | `gap-6` | Copy vibe_figma value |
| Arbitrary values | `w-[480px]` | `w-96` (close but wrong) | Copy vibe_figma value |
| Background opacity | `bg-black/60` | `bg-black/50` | Copy vibe_figma value |

## Rules
- **This is a CODE REVIEW — no screenshots, no deployment needed**
- **The vibe_figma output is the ground truth for visual accuracy**
- **The theme code is the ground truth for CMS integration** (providers, hooks, dynamic data)
- **This phase merges both** — visual accuracy FROM vibe_figma, CMS features FROM theme system
- **Do NOT skip any component** — check every single one, including Footer and LangSwitcher
- **Always FIX by copying from vibe_figma** — never guess or approximate classes
- **Transform, don't rebuild** — if a whole section looks wrong (rebuilt instead of transformed), copy the entire JSX block from vibe_figma and re-add CMS wrappers around it

## Output
- All theme components updated with correct Tailwind classes from vibe_figma
- `$MIGRATION_DIR/ui-verification-report.md` — drift report
- No remaining class drifts between vibe_figma output and theme code
