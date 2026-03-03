# Phase 1c: Design Tokens (Optional — from vibe_figma output)

## Goal
Extract a quick-reference design token summary from the vibe_figma generated code. This is now a **lightweight** phase since vibe_figma code already contains exact values.

## Why This Phase is Now Optional
Previously, design tokens were manually extracted from raw Figma API data. Now, **vibe_figma code IS the design token reference** — the generated Tailwind classes contain exact colors, fonts, spacing, etc.

This phase is only needed if you want a human-readable summary for quick reference. If time is limited, skip this and read vibe_figma `.tsx` files directly during Phase 4.

## Input
- `$MIGRATION_DIR/vibe-output/` — vibe_figma generated React code
- `$MIGRATION_DIR/screenshots/` — visual reference

## Process

### Step 1: Read vibe_figma output and extract patterns

Read each generated `.tsx` file and note:
- **Colors**: all `bg-[#hex]`, `text-[#hex]`, `border-[#hex]` values
- **Fonts**: all `font-[family]`, `text-[size]`, `font-[weight]` values
- **Spacing**: recurring padding/margin/gap patterns
- **Borders**: border-radius, border-width, border-color patterns

### Step 2: Create design-tokens.md (quick summary)

Write `$MIGRATION_DIR/design-tokens.md` with a condensed format:

```markdown
# Design Tokens (extracted from vibe_figma output)

## Color Palette
- Primary: #2563EB (buttons, accents)
- Background: #FFFFFF (header, footer, sections)
- Dark sections: #0F172A (hero)
- Text primary: #1A1A2E
- Text secondary: #475569
- Text muted: #94A3B8
- Border: #E5E7EB

## Typography
- Heading font: Inter
- Body font: Inter
- Weights used: 400, 500, 600, 700

## Common Patterns
- Container max-width: 1280px
- Section padding: 80px vertical
- Card border-radius: 8px
- Button border-radius: 6px
```

## Rules
- **This is a summary for quick reference only** — the vibe_figma `.tsx` files are the actual source of truth
- **Skip this phase if time is limited** — Phase 4 can read vibe_figma output directly
- **Do NOT spend time on exhaustive per-element documentation** — vibe_figma code already has the exact values

## Output
- `$MIGRATION_DIR/design-tokens.md` — optional quick-reference summary
