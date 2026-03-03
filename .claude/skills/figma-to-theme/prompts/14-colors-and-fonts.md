# Phase 5: Colors and Fonts

## Goal
Extract the color palette and typography from Figma data and apply them to the theme's CSS variables and Google Fonts imports.

## Input
- `$MIGRATION_DIR/vibe-output/` — vibe_figma generated code (extract colors and font families from Tailwind classes)
- `$MIGRATION_DIR/design-map.md` — color palette and font sections
- `$MIGRATION_DIR/screenshots/` — visual reference

**Tip:** Search the vibe_figma `.tsx` files for `bg-[#`, `text-[#`, `border-[#` to find all hex colors used. Search for `font-[` to find font family references.

## Process

### Step 1: Identify Primary Color
Find the most prominent brand color from the design:
- Button backgrounds
- Active link colors
- Accent elements
- Header/footer background (if colored)

### Step 2: Generate Color Scale
From the primary color, generate a 50-900 scale for `main.css`:

```css
:root {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;   /* Base — closest to Figma brand color */
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
}
```

Use these guidelines:
- 500 = the primary brand color from Figma
- 50-400 = progressively lighter tints
- 600-900 = progressively darker shades
- If the brand color is very light, it might be 400 or 300 instead

### Step 3: Map Additional Colors
For colors used in the design that aren't primary:
- Use Tailwind's built-in palette when close enough (gray, red, green, blue, etc.)
- Only add custom CSS variables for truly unique colors
- Avoid `bg-[#hex]` arbitrary values — find the nearest Tailwind class

### Step 4: Update main.css
Replace the color variables in `themes/<name>/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary-50: ...;
  --color-primary-100: ...;
  /* ... through 900 */

  /* Font family */
  --font-sans: 'Inter', sans-serif;
}
```

### Step 5: Identify Fonts
From the Figma typography data:
- Heading font (used on h1-h6, hero text)
- Body font (used on paragraphs, links, UI text)
- They may be the same font with different weights

### Step 6: Update Google Fonts
In ALL `.astro` files, update the Google Fonts `<link>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
```

Include only the weights actually used in the design.

### Step 7: Update Tailwind Config
If using a non-default font, update `tailwind.config.js`:
```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Playfair Display', 'serif'],
      },
    },
  },
};
```

## Common Font Mappings (Figma → Google Fonts)
| Figma Font | Google Fonts Name |
|---|---|
| Inter | Inter |
| Roboto | Roboto |
| Open Sans | Open Sans |
| Lato | Lato |
| Poppins | Poppins |
| Montserrat | Montserrat |
| Playfair Display | Playfair Display |
| Merriweather | Merriweather |
| Source Sans Pro | Source Sans 3 |
| Nunito | Nunito |
| Raleway | Raleway |
| DM Sans | DM Sans |

If the Figma font isn't on Google Fonts, find the closest alternative.

## Checklist
- [ ] Primary color extracted and 50-900 scale generated
- [ ] CSS variables updated in main.css
- [ ] Tailwind config uses primary color scale via CSS variables
- [ ] Heading and body fonts identified from Figma
- [ ] Google Fonts `<link>` updated in ALL `.astro` files
- [ ] Font family set in Tailwind config
- [ ] No arbitrary hex colors (`bg-[#hex]`) in components — all use palette
- [ ] Font weights in Google Fonts import match weights used in components
