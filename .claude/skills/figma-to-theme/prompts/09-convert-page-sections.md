# Phase 4f: Convert Page Content Sections

## Goal
Implement every content section on each page that **exactly clones** the Figma design. Use actual extracted assets (icons, illustrations, photos), exact colors, exact spacing.

## Input (MANDATORY)
1. `$MIGRATION_DIR/vibe-output/<page-slug>/` — vibe_figma generated code for each page
2. `$MIGRATION_DIR/design-map.md` — section list per page
3. `$MIGRATION_DIR/screenshots/` — visual reference
4. `themes/<name>/assets/images/` — all assets (collected from vibe_figma)

## CRITICAL: Use vibe_figma Code as Starting Point

Read the vibe_figma output for each page to see exact section styling. The generated code contains:
- Exact Tailwind classes for every section (background, padding, layout)
- Correct asset imports for icons, photos, illustrations
- Exact text content from the design

**Copy Tailwind classes directly from vibe_figma output.** Only restructure for CMS integration.

Every icon, illustration, graphic, and photo that appears in the design MUST use the actual file extracted by vibe_figma:

```tsx
// CORRECT: using actual asset from vibe_figma extraction
import iconWirtschaftlichkeit from '../assets/images/icon-wirtschaftlichkeit.svg';
import iconKontrolle from '../assets/images/icon-kontrolle.svg';
import iconTransparenz from '../assets/images/icon-transparenz.svg';
import iconRisiko from '../assets/images/icon-risikominderung.svg';

// WRONG: substituting with FontAwesome
// import { faChartLine, faShield } from '@fortawesome/free-solid-svg-icons';
```

**RULE: Only use FontAwesome if the Figma design itself uses FontAwesome icons.** If the design has custom illustrations/graphics, use the extracted files.

## Section Conversion Process

### For EACH section in design-tokens.md:

**Step 1: Read the exact token values**
```
Section: "Ihre Vorteile"
Background: #F1F5F9
Padding: 80px vertical
Heading: "Ihre Vorteile", Inter 36px bold #0F172A
Subtitle: Inter 16px normal #475569
Grid: 4 columns, gap 32px
Card icon: CUSTOM SVG from assets (48x48, no background tint)
Card title: Inter 18px bold #0F172A
Card description: Inter 14px normal #475569
```

**Step 2: Write code matching EXACT values**
```tsx
function IhreVorteileSection() {
  const advantages = [
    {
      icon: iconWirtschaftlichkeit,
      title: 'Wirtschaftlichkeit',
      description: 'Umfassende Kostenoptimierung, auch außerhalb...'  // EXACT text from Figma
    },
    {
      icon: iconKontrolle,
      title: 'Kontrollierter Ressourceneinsatz',
      description: 'Alcoris optimiert den gesamten Einsatz...'  // EXACT text
    },
    // ... all items from Figma
  ];

  return (
    <section className="bg-[#F1F5F9] py-20">  {/* EXACT bg and padding from tokens */}
      <div className="max-w-[1440px] mx-auto px-16">
        <h2 className="text-[36px] font-bold text-[#0F172A]">Ihre Vorteile</h2>
        <p className="mt-4 text-base text-[#475569] max-w-[600px]">
          {/* EXACT subtitle text */}
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((item, i) => (
            <div key={i}>
              {/* ACTUAL Figma icon — not FontAwesome */}
              <img src={item.icon.src} alt={item.title} className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-bold text-[#0F172A]">{item.title}</h3>
              <p className="mt-2 text-sm text-[#475569]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Verify against screenshot**
Read the Figma screenshot and compare each element:
- Correct number of columns? ✓
- Icons are the actual Figma graphics? ✓ (NOT FontAwesome substitutes)
- Background color matches? ✓
- Text content is exact? ✓
- Spacing matches? ✓

## Section-by-Section Rules

### Feature/Advantage Grids
- Use EXACT icons from Figma assets — never substitute
- Match exact column count from design
- Match exact card styling (background, border, shadow, padding)
- Match icon container styling (size, background tint, border-radius)

### Photo Sections
- Use ACTUAL photos downloaded from Figma
- Match exact photo sizing and aspect ratio
- Match border-radius on photos
- Match photo layout (grid, side-by-side, overlapping)

### CTA/Banner Sections
- Match exact background (solid, gradient, or image)
- Match exact text alignment and positioning
- Match button style precisely (filled, outline, ghost)
- Match button text exactly

### Form Sections
- Match exact input styling (height, border, radius, padding)
- Match button type (icon-only, text, icon+text)
- Match layout (inline, stacked)

### Text/Content Sections
- Match exact heading hierarchy and sizes
- Match column layout (1-col, 2-col, 3-col)
- Match text max-width constraints
- Include ALL text content from Figma

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---------|-----------------|
| FontAwesome icons when Figma has custom graphics | Import and use actual SVG/PNG from assets |
| Wrong section background color | Read EXACT hex from design-tokens.md |
| Fewer/more columns than Figma | Count exact columns in screenshot |
| Placeholder text "Lorem ipsum" | Use EXACT text content from Figma |
| Missing photos / gray placeholders | Use actual photos downloaded in Phase 1b |
| Wrong section order | Follow EXACT order from design-map.md |
| Adding sections not in Figma | Only build what's in the design |
| Different icon colors than Figma | Use original SVG colors, don't tint |

## Verification Checklist (per section)
- [ ] Background color matches design-tokens.md EXACTLY
- [ ] Padding matches EXACTLY
- [ ] Heading: text, font, size, weight, color match
- [ ] All icons/graphics are actual Figma assets (NOT FontAwesome)
- [ ] All photos are actual Figma photos (NOT placeholders)
- [ ] Column count and gap match EXACTLY
- [ ] Card/item styling matches EXACTLY
- [ ] Text content matches Figma word-for-word
- [ ] Section order on page matches Figma top-to-bottom order
- [ ] No extra sections added that aren't in Figma
- [ ] No sections missing that ARE in Figma
