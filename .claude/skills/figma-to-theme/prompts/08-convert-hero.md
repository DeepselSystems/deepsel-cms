# Phase 4e: Convert Hero / Banner Sections

## Goal
Implement hero sections that **exactly clone** the Figma design — correct background (image/color/gradient), exact text positioning, exact button styling, exact overlay.

## Input (MANDATORY)
1. `$MIGRATION_DIR/vibe-output/homepage/` — vibe_figma generated code (look at hero section)
2. `$MIGRATION_DIR/screenshots/` — visual reference
3. `themes/<name>/assets/images/` — hero background image (from vibe_figma assets)

## CRITICAL: Use vibe_figma Output as Reference

Read the vibe_figma generated code to see how it handles the hero section:
- Background treatment (image with overlay? solid color? gradient?)
- Image imports and references
- Text positioning and Tailwind classes
- Button styling

If the Figma hero has a background image, vibe_figma should have extracted it. Verify:
1. Check `themes/<name>/assets/images/` for the hero background file
2. Import it in the component: `import heroBg from '../assets/images/hero-background.jpg'`
3. Use it as the actual background — do NOT use a solid color placeholder

```tsx
// If Figma has a background image with overlay:
<section className="relative h-[600px] lg:h-[700px]">
  <div className="absolute inset-0">
    <img src={heroBg.src} alt="" className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-[#0F172A]/70" /> {/* EXACT overlay color+opacity from tokens */}
  </div>
  <div className="relative z-10 ...">
    {/* content */}
  </div>
</section>

// If Figma has a solid color background (NO image):
<section className="bg-[#0F172A] h-[600px] ...">
  {/* content */}
</section>

// If Figma has a gradient:
<section className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] ...">
  {/* content */}
</section>
```

## CRITICAL: Match Text Positioning Exactly

Read design-tokens.md for hero text:
- **Alignment**: left? center? right?
- **Vertical position**: centered? top-third? bottom?
- **Max width**: constrained or full-width?
- **Exact font values**: family, size, weight, color, line-height for EVERY text element

```tsx
{/* Example: left-aligned, vertically centered, max-width constrained */}
<div className="relative z-10 max-w-[1440px] mx-auto px-16 h-full flex items-center">
  <div className="max-w-[600px]">
    <h1 className="text-[56px] font-bold text-white leading-tight" style={{ fontFamily: 'Inter' }}>
      Alcoris Treuhand
    </h1>
    <p className="mt-4 text-base text-[#CBD5E1] max-w-[500px]">
      {/* EXACT subtitle text from Figma */}
    </p>
    <p className="mt-6 text-sm text-[#94A3B8]">
      {/* EXACT team names from Figma */}
    </p>
  </div>
</div>
```

## CRITICAL: Match Button Styling Exactly

Hero CTA buttons must match design-tokens.md:
```tsx
{/* Example: if tokens say outline white button, not filled */}
<a href="/kontakt" className="inline-block border-2 border-white text-white text-sm font-medium px-8 py-3 rounded-md hover:bg-white/10 transition-colors">
  Kontakt
</a>

{/* NOT this generic style: */}
{/* <a className="bg-primary-600 text-white px-6 py-3 rounded-lg">CTA</a> */}
```

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---------|-----------------|
| Solid color bg when Figma has background image | Use downloaded hero image from assets |
| Wrong overlay opacity | Read exact value from tokens (e.g., 70% not 50%) |
| Centered text when Figma is left-aligned | Match exact alignment from tokens |
| Generic "Hero Title" placeholder text | Use EXACT text from Figma |
| Wrong text size (text-5xl when Figma is 56px) | Use `text-[56px]` for exact match |
| Filled CTA button when Figma is outline | Match exact button style from tokens |
| Missing subtitle or team names | Include EVERY text element from design |

## Responsive Rules
Read design-tokens.md for mobile hero values (if mobile frame exists):
- Height: smaller on mobile (`h-[400px] lg:h-[600px]`)
- Text size: `text-[32px] lg:text-[56px]`
- Padding: `px-6 lg:px-16`
- Image: may need different `object-position`

## Verification Checklist
- [ ] Background type matches Figma EXACTLY (image/solid/gradient)
- [ ] If image: actual Figma asset used, NOT placeholder
- [ ] Overlay color and opacity match EXACTLY
- [ ] Hero height matches EXACTLY
- [ ] Text alignment (left/center/right) matches EXACTLY
- [ ] Headline: text content, font, size, weight, color, line-height match
- [ ] Subtitle: text content, font, size, weight, color match
- [ ] All additional text elements (team names, dates, etc.) present and styled
- [ ] CTA buttons: text, bg, border, padding, radius match EXACTLY
- [ ] Responsive: mobile hero matches mobile Figma frame
