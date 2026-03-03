# Phase 4b: Convert Header / Logo / Nav Bar

## Goal
Implement the header section that **exactly clones** the Figma design. Every color, spacing, font, border, and element position must match the design tokens.

## Input (MANDATORY — read these before writing ANY code)
1. `$MIGRATION_DIR/vibe-output/homepage/` — vibe_figma generated code (look at header section)
2. `$MIGRATION_DIR/screenshots/` — visual reference for the header
3. `themes/<name>/assets/images/` — logo and icon assets (collected from vibe_figma)
4. `$MIGRATION_DIR/design-tokens.md` — optional quick reference (if created)

## CRITICAL: Read vibe_figma Output First

Before writing a single line of code, open the vibe_figma generated `.tsx` for the homepage and find the header section. Extract the exact Tailwind classes for:
- Background color (it might be `bg-white`, NOT dark — trust the generated code)
- Height (e.g., `h-20`)
- Horizontal padding (e.g., `px-16`)
- Logo style (text classes or image element)
- Menu link style (font, size, weight, color classes)
- Button style (background, text, padding, border-radius classes)

**vibe_figma already has pixel-accurate Tailwind classes** — use them directly. Only add CMS integration (Menu.tsx, dynamic data) on top.
- Exact spacing between elements
- Exact border/shadow on header

**DO NOT USE GENERIC PATTERNS.** The design tokens tell you the EXACT values.

## Conversion Process

### Step 1: Map design token values to Tailwind

For each token value, find the CLOSEST Tailwind class:
```
Token: background #FFFFFF → Tailwind: bg-white
Token: background #0F172A → Tailwind: bg-slate-900
Token: height 80px → Tailwind: h-20
Token: padding 0 64px → Tailwind: px-16
Token: font 14px medium #4A4A68 → Tailwind: text-sm font-medium text-[#4A4A68]
Token: border-radius 6px → Tailwind: rounded-md
Token: gap 32px → Tailwind: gap-8
```

**When Tailwind has no close match, use arbitrary values**: `text-[#4A4A68]`, `px-[64px]`, `h-[80px]`
**Prefer exact arbitrary values over wrong Tailwind defaults** — `bg-[#0F172A]` is better than wrong `bg-gray-900`.

### Step 2: Build the header matching EXACT layout

Example — if design-tokens.md says:
```
Header: bg white, h-80px, border-bottom 1px #E5E7EB, px-64, max-width 1440px centered
Logo: "alcoris." text, Inter 20px bold #1A1A2E
Menu links: Inter 14px medium #4A4A68, gap 32px, active: #1A1A2E border-b-2
Button: bg #2563EB, text white 14px medium, px-24 py-10, rounded-6
```

Then code MUST be:
```tsx
<header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
  <div className="max-w-[1440px] mx-auto px-16 h-20 flex items-center justify-between">
    {/* Logo — EXACT match */}
    <a href="/" className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'Inter' }}>
      alcoris.
    </a>

    {/* Desktop nav */}
    <nav className="hidden lg:flex items-center gap-8">
      <Menu />
      {/* CTA Button — EXACT match */}
      <a href="/kontakt" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors">
        Kontakt
      </a>
    </nav>
  </div>
</header>
```

### Step 3: Use actual logo asset if it's an image

If the design has a logo image (not text):
```tsx
import logo from '../assets/images/logo.svg';
// ...
<a href="/"><img src={logo.src} alt="Brand" className="h-8" /></a>
```

### Step 4: Handle CMS override
```tsx
const { websiteData } = useWebsiteData();
const cmsLogo = websiteData?.settings?.logo;
// If CMS has a logo, use it; otherwise use the design asset/text
```

## Common Mistakes to Avoid

| Mistake | Why it happens | Correct approach |
|---------|---------------|-----------------|
| Dark header when Figma is white | Using generic "dark header" pattern | Read design-tokens.md — use EXACT bg color |
| Wrong button color | Guessing primary color | Read design-tokens.md — use EXACT hex |
| Wrong menu link spacing | Using default gap-6 | Read design-tokens.md — use EXACT gap value |
| Missing border-bottom | Not noticing subtle border | Read design-tokens.md — includes border spec |
| Wrong font family | Defaulting to sans-serif | Read design-tokens.md — use EXACT font |
| Button has wrong border-radius | Using rounded-lg instead of rounded-md | Read design-tokens.md — 6px = rounded-md |

## Responsive Rules
- Desktop: full horizontal nav visible
- Mobile: nav hidden, hamburger button shown
- Breakpoint: `lg:` (1024px) for nav visibility
- Logo may resize: check if design-tokens.md has mobile variant
- Header height may change: check mobile frame tokens

## Verification Checklist
- [ ] Background color matches design-tokens.md EXACTLY
- [ ] Height matches EXACTLY
- [ ] Logo matches (text content, font, size, color — or image file)
- [ ] Menu link font, size, weight, color match EXACTLY
- [ ] Menu link active/hover states match EXACTLY
- [ ] CTA button: bg color, text color, padding, border-radius, border match EXACTLY
- [ ] Spacing between elements matches EXACTLY
- [ ] Border/shadow on header matches EXACTLY
- [ ] Compare your code output against Figma screenshot — does it look identical?
