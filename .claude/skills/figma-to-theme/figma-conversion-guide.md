# Figma-to-React+Tailwind Conversion Guide

This reference documents all known conversion pitfalls and their solutions. The skill MUST follow these rules when converting Figma designs to theme code.

---

## 1. Auto Layout → Flexbox/Grid Mapping

Figma Auto Layout is a **subset** of CSS Flexbox. It lacks `flex-wrap`, `space-around`, `space-evenly`, proportional `flex-grow`, and CSS Grid entirely.

### Complete Property Mapping

```
Figma Auto Layout Property     →  Tailwind Classes
───────────────────────────────────────────────────
Direction: Horizontal          →  flex (row is default)
Direction: Vertical            →  flex flex-col
Direction: Wrap                →  flex flex-wrap
Gap: N px                      →  gap-{round(N/4)}
Padding: uniform N             →  p-{round(N/4)}
Padding: horiz H, vert V      →  px-{round(H/4)} py-{round(V/4)}
Padding: T R B L               →  pt-{} pr-{} pb-{} pl-{}

Align items: Top-Left          →  items-start justify-start
Align items: Top-Center        →  items-start justify-center
Align items: Top-Right         →  items-start justify-end
Align items: Center-Left       →  items-center justify-start
Align items: Center-Center     →  items-center justify-center
Align items: Center-Right      →  items-center justify-end
Align items: Bottom-Left       →  items-end justify-start
Align items: Bottom-Center     →  items-end justify-center
Align items: Bottom-Right      →  items-end justify-end
Spacing mode: Space Between    →  justify-between

Child sizing: Hug contents     →  w-fit (or omit, it's default)
Child sizing: Fill container   →  flex-1 (or w-full / grow)
Child sizing: Fixed width      →  w-[Npx] or nearest Tailwind w-*
Min width on child             →  min-w-[Npx]
Max width on child             →  max-w-[Npx]

Clip content: on               →  overflow-hidden
Clip content: off              →  overflow-visible
Ignore auto layout (abs pos)   →  absolute (parent needs: relative)
```

### What Figma CANNOT Represent (add manually)

- `flex-wrap` for wrapping grids — add when items should wrap to next row
- `grid grid-cols-N` — use when Figma shows a grid-like pattern with equal columns
- Proportional `flex-grow` ratios — use `w-1/3 w-2/3` or `grow-[2]` when layout shows unequal splits
- `space-around` / `space-evenly` — infer from visual spacing
- `order-*` for reordering — when mobile shows different order than desktop

---

## 2. Pixel-to-Tailwind Scale Conversion

**NEVER use raw pixel values in Tailwind classes.** Always round to the nearest Tailwind spacing unit.

### Spacing Scale (4px base)

```
Figma px  →  Tailwind class  →  rem
─────────────────────────────────
0         →  0               →  0
1         →  px              →  1px
2         →  0.5             →  0.125rem
4         →  1               →  0.25rem
6         →  1.5             →  0.375rem
8         →  2               →  0.5rem
10        →  2.5             →  0.625rem
12        →  3               →  0.75rem
14        →  3.5             →  0.875rem
16        →  4               →  1rem
20        →  5               →  1.25rem
24        →  6               →  1.5rem
28        →  7               →  1.75rem
32        →  8               →  2rem
36        →  9               →  2.25rem
40        →  10              →  2.5rem
44        →  11              →  2.75rem
48        →  12              →  3rem
56        →  14              →  3.5rem
64        →  16              →  4rem
80        →  20              →  5rem
96        →  24              →  6rem
112       →  28              →  7rem
128       →  32              →  8rem
144       →  36              →  9rem
160       →  40              →  10rem
176       →  44              →  11rem
192       →  48              →  12rem
224       →  56              →  14rem
256       →  64              →  16rem
288       →  72              →  18rem
320       →  80              →  20rem
384       →  96              →  24rem
```

**Rounding rule:** Use the closest value. 15px → `4` (16px). 22px → `5` (20px) or `6` (24px). Prefer the closest match.

### Typography Scale

```
Figma px  →  Tailwind text-*  →  rem
──────────────────────────────────
12        →  text-xs          →  0.75rem
14        →  text-sm          →  0.875rem
16        →  text-base        →  1rem
18        →  text-lg          →  1.125rem
20        →  text-xl          →  1.25rem
24        →  text-2xl         →  1.5rem
30        →  text-3xl         →  1.875rem
36        →  text-4xl         →  2.25rem
48        →  text-5xl         →  3rem
60        →  text-6xl         →  3.75rem
72        →  text-7xl         →  4.5rem
96        →  text-8xl         →  6rem
128       →  text-9xl         →  8rem
```

### Font Weight

```
Figma Weight Name   →  Tailwind class
────────────────────────────────────
Thin / 100          →  font-thin
Extra Light / 200   →  font-extralight
Light / 300         →  font-light
Regular / 400       →  font-normal
Medium / 500        →  font-medium
Semi Bold / 600     →  font-semibold
Bold / 700          →  font-bold
Extra Bold / 800    →  font-extrabold
Black / 900         →  font-black
```

### Line Height

```
Figma %     →  Tailwind leading-*  →  Value
──────────────────────────────────────────
100%        →  leading-none        →  1
~115%       →  leading-tight       →  1.25
~130%       →  leading-snug        →  1.375
150%        →  leading-normal      →  1.5
~163%       →  leading-relaxed     →  1.625
200%        →  leading-loose       →  2
```

### Letter Spacing

```
Figma %     →  Tailwind tracking-*  →  em value
──────────────────────────────────────────────
-5%         →  tracking-tighter     →  -0.05em
-2.5%       →  tracking-tight       →  -0.025em
0%          →  tracking-normal      →  0
2.5%        →  tracking-wide        →  0.025em
5%          →  tracking-wider       →  0.05em
10%         →  tracking-widest      →  0.1em
```

### Border Radius

```
Figma px  →  Tailwind rounded-*
──────────────────────────────
0         →  rounded-none
2         →  rounded-sm
4         →  rounded
6         →  rounded-md
8         →  rounded-lg
12        →  rounded-xl
16        →  rounded-2xl
24        →  rounded-3xl
9999      →  rounded-full
```

---

## 3. Responsive Design Strategy

### Mobile-First Approach (MANDATORY)

Figma designs are static artboards. The conversion MUST use Tailwind's mobile-first methodology:

1. **Base styles = mobile layout** (smallest breakpoint)
2. Layer responsive overrides with `sm:`, `md:`, `lg:`, `xl:` prefixes
3. **Never write desktop-first** — wrong: `w-1/3 sm:w-full`, right: `w-full lg:w-1/3`

### Breakpoint Mapping

```
Figma Frame Width     →  Tailwind Breakpoint  →  CSS
──────────────────────────────────────────────────────
320-390px (mobile)    →  (base, no prefix)    →  Default
640px                 →  sm:                  →  @media (min-width: 640px)
768px (tablet)        →  md:                  →  @media (min-width: 768px)
1024px                →  lg:                  →  @media (min-width: 1024px)
1280px (desktop)      →  xl:                  →  @media (min-width: 1280px)
1536px                →  2xl:                 →  @media (min-width: 1536px)
```

### Inferring Responsive Behavior

When Figma provides multiple frames (desktop + mobile):

1. **Compare corresponding elements** across frames by matching text content and visual structure
2. **Detect layout direction changes:** Horizontal on desktop → vertical on mobile = `flex flex-col lg:flex-row`
3. **Detect visibility changes:** Element missing on mobile = `hidden lg:block`
4. **Detect size changes:** Different font sizes = `text-2xl lg:text-4xl`
5. **Detect column count changes:** 3 cols desktop, 1 col mobile = `grid grid-cols-1 lg:grid-cols-3`
6. **Base styles = mobile frame**, desktop differences get `lg:` or `xl:` prefixes

When only a desktop frame exists, **infer mobile behavior:**

| Desktop Pattern | Mobile Inference |
|----------------|-----------------|
| Horizontal nav links | Hamburger menu: `hidden md:flex` for links, `flex md:hidden` for hamburger |
| 3-4 column grid | 1 column: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| Side-by-side content | Stacked: `flex flex-col lg:flex-row` |
| Wide hero (500px height) | Shorter: `h-[300px] md:h-[400px] lg:h-[500px]` |
| Large headings (48px) | Smaller: `text-3xl md:text-4xl lg:text-5xl` |
| Large padding (64px) | Reduced: `p-4 md:p-8 lg:p-16` |
| Sidebar + content | Sidebar hidden on mobile: sidebar gets `hidden lg:block` |
| Fixed-width container | Full-width on mobile: `w-full max-w-7xl mx-auto` |

### Common Responsive Patterns

```tsx
// Hamburger menu pattern
<nav className="hidden md:flex items-center gap-6">{/* desktop links */}</nav>
<button className="flex md:hidden">{/* hamburger icon */}</button>

// Stacking columns
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} />)}
</div>

// Responsive typography
<h1 className="text-3xl md:text-4xl lg:text-6xl font-bold">Title</h1>

// Responsive spacing
<section className="px-4 py-8 md:px-8 md:py-12 lg:px-16 lg:py-20">

// Responsive visibility
<aside className="hidden lg:block w-64">{/* sidebar */}</aside>

// Responsive image
<img className="w-full h-48 md:h-64 lg:h-96 object-cover" />
```

---

## 4. Eliminating Excessive Div Nesting

Figma layer hierarchy creates deep nesting. **Flatten aggressively.**

### Rules

1. **Remove wrapper divs that only have one child and no styling**
2. **Use semantic HTML** instead of `<div>` everywhere:

```
Figma Layer Name          →  HTML Element
────────────────────────────────────────
Header / Navbar / TopBar  →  <header>
Navigation / Nav / Menu   →  <nav>
Main / Content / Body     →  <main>
Section / Block           →  <section>
Article / Post / Card     →  <article>
Footer / Bottom           →  <footer>
Sidebar / Aside           →  <aside>
Heading text              →  <h1>-<h6> (by visual hierarchy)
Paragraph text            →  <p>
List of items             →  <ul> + <li>
Clickable frame (no URL)  →  <button>
Clickable frame (URL)     →  <a>
Image container           →  <figure> (with <figcaption> if captioned)
Form section              →  <form>
Input field               →  <input> / <textarea> / <select>
```

3. **Max nesting depth: 5 levels.** If generated code exceeds this, refactor.
4. **Collapse frames** that only add padding/margin — move those styles to the parent or child.

### Before/After Example

```tsx
// BAD: Direct Figma layer translation (7 levels deep)
<div className="flex flex-col">          {/* Frame: Page */}
  <div className="flex">                 {/* Frame: HeaderWrapper */}
    <div className="flex items-center">  {/* Frame: HeaderContent */}
      <div className="flex">             {/* Frame: LogoArea */}
        <div>                            {/* Frame: LogoContainer */}
          <a href="/">Logo</a>
        </div>
      </div>
    </div>
  </div>
</div>

// GOOD: Flattened with semantic HTML (3 levels)
<div className="flex flex-col">
  <header className="flex items-center">
    <a href="/">Logo</a>
  </header>
</div>
```

---

## 5. Visual Effects Conversion

### Shadows

```
Figma Shadow                          →  Tailwind
────────────────────────────────────────────────
Drop shadow: 0 1 2 rgba(0,0,0,0.05)  →  shadow-sm
Drop shadow: 0 1 3 rgba(0,0,0,0.1)   →  shadow
Drop shadow: 0 4 6 rgba(0,0,0,0.1)   →  shadow-md
Drop shadow: 0 10 15 rgba(0,0,0,0.1) →  shadow-lg
Drop shadow: 0 20 25 rgba(0,0,0,0.1) →  shadow-xl
Drop shadow: 0 25 50 rgba(0,0,0,0.25)→  shadow-2xl
Inner shadow                          →  shadow-inner
No shadow                             →  shadow-none
```

### Background Blur / Backdrop

```
Figma Effect          →  Tailwind
────────────────────────────────
Background blur: 4px  →  backdrop-blur-sm
Background blur: 8px  →  backdrop-blur
Background blur: 12px →  backdrop-blur-md
Background blur: 16px →  backdrop-blur-lg
Background blur: 24px →  backdrop-blur-xl
Background blur: 40px →  backdrop-blur-2xl
Background blur: 64px →  backdrop-blur-3xl
Layer blur: Npx       →  blur-sm / blur / blur-md / blur-lg etc.
```

### Opacity

```
Figma Opacity  →  Tailwind
──────────────────────────
0%             →  opacity-0
5%             →  opacity-5
10%            →  opacity-10
20%            →  opacity-20
25%            →  opacity-25
30%            →  opacity-30
40%            →  opacity-40
50%            →  opacity-50
60%            →  opacity-60
70%            →  opacity-70
75%            →  opacity-75
80%            →  opacity-80
90%            →  opacity-90
95%            →  opacity-95
100%           →  opacity-100
```

### Gradients

```
Figma Gradient                       →  Tailwind
──────────────────────────────────────────────────
Linear top→bottom (A to B)          →  bg-gradient-to-b from-[A] to-[B]
Linear left→right (A to B)          →  bg-gradient-to-r from-[A] to-[B]
Linear with midpoint (A→B→C)        →  bg-gradient-to-r from-[A] via-[B] to-[C]
Diagonal top-left→bottom-right      →  bg-gradient-to-br from-[A] to-[B]
```

Direction mapping:
```
Figma angle   →  Tailwind direction
0° (top)      →  bg-gradient-to-t
45° (top-r)   →  bg-gradient-to-tr
90° (right)   →  bg-gradient-to-r
135° (bot-r)  →  bg-gradient-to-br
180° (bottom) →  bg-gradient-to-b
225° (bot-l)  →  bg-gradient-to-bl
270° (left)   →  bg-gradient-to-l
315° (top-l)  →  bg-gradient-to-tl
```

---

## 6. Color Extraction Strategy

### From Figma to CSS Variables

1. Identify the **primary brand color** (most used accent/button color)
2. Generate a full 50-900 scale from that base color
3. Map secondary colors to either Tailwind defaults or additional CSS variables

### Generating a Palette from a Single Color

Given a primary color (e.g., `#2563EB` blue-600):
- `50`: Very light tint (nearly white)
- `100-200`: Light tints
- `300-400`: Medium tints
- `500`: The base color
- `600-700`: Slightly darker
- `800-900`: Very dark shades

If the Figma design uses multiple distinct hues, create additional CSS variable sets (e.g., `--color-secondary-*`, `--color-accent-*`) and extend `tailwind.config.js`.

### Handling Arbitrary Colors

For colors that don't fit the primary scale, use Tailwind's built-in palette:
- Grays: `gray-50` through `gray-900`
- Status colors: `red-500`, `green-500`, `yellow-500`, `blue-500`
- Avoid arbitrary `bg-[#hex]` when a Tailwind default is close enough (within 5% perceived difference)

---

## 7. Image and Asset Handling

### Rules

1. **Hero/background images**: Download from Figma, save to `assets/images/`
2. **Icons**: Prefer FontAwesome icons over SVG exports (already a theme dependency)
3. **SVGs from Figma**: Optimize before using — remove metadata, use `currentColor` for fill
4. **User-uploaded images** (blog posts, avatars): Always use `/api/v1/attachment/serve/${filename}` — never hardcode
5. **Image responsiveness**: Always use `w-full h-auto object-cover` as baseline
6. **Aspect ratios**: Use `aspect-video` (16:9), `aspect-square` (1:1), or `aspect-[W/H]`

### Placeholder Strategy

If Figma uses placeholder images or stock photos:
- Download the actual images from Figma for hero/backgrounds
- For content images (blog thumbnails), these come from the CMS dynamically — don't hardcode
- Keep `hero.jpg` as the minimum required asset

---

## 8. Accessibility Checklist

Figma designs have NO accessibility information. Always add:

1. **Alt text on all `<img>` tags** — use post title, author name, or descriptive text
2. **`aria-label` on icon-only buttons** (hamburger, close, language switcher)
3. **Heading hierarchy** — one `<h1>` per page, then `<h2>`, `<h3>` in order
4. **Focus states** — add `focus:outline-none focus:ring-2 focus:ring-primary-500` on interactive elements
5. **Color contrast** — ensure text on colored backgrounds meets WCAG AA (4.5:1 for text, 3:1 for large text)
6. **Keyboard navigation** — all interactive elements must be focusable and operable via keyboard
7. **`<button>` for actions, `<a>` for navigation** — never use `<div onClick>`

---

## 9. Component Extraction Heuristics

When to extract a section into a separate component:

1. **Repeated patterns** — If a visual pattern appears 2+ times (cards, list items), extract it
2. **Distinct visual sections** — Header, hero, features grid, testimonials, footer
3. **Interactive elements** — Anything with state (dropdowns, accordions, tabs)
4. **Responsive variants** — If a section has substantially different mobile/desktop layouts

### Naming Convention

```
components/
├── Page.tsx           # REQUIRED: Main page wrapper
├── BlogList.tsx       # REQUIRED: Blog listing
├── BlogPost.tsx       # REQUIRED: Blog post
├── Menu.tsx           # REQUIRED: Top navigation
├── Sidebar.tsx        # REQUIRED: Side navigation
├── Footer.tsx         # REQUIRED: Footer
├── LangSwitcher.tsx   # REQUIRED: Language switcher
├── Hero.tsx           # Optional: Hero/banner section
├── FeatureCard.tsx    # Optional: Repeated feature card
├── TestimonialCard.tsx# Optional: Testimonial card
├── CTASection.tsx     # Optional: Call-to-action section
└── PricingTable.tsx   # Optional: Pricing table
```

---

## 10. Z-Index Management

Figma has no z-index property. Assign z-index based on element type:

```
Element Type          →  Tailwind z-*
──────────────────────────────────────
Page content          →  z-0 (default)
Sticky header         →  z-40
Dropdown menus        →  z-20
Modal overlays        →  z-50
Tooltips/popovers     →  z-30
Mobile nav drawer     →  z-50
Toast notifications   →  z-[9999]
```

Always add `relative` to parents of absolutely-positioned children, and `z-*` to overlapping elements. This prevents the common Figma-to-code bug where dropdowns render behind subsequent content.
