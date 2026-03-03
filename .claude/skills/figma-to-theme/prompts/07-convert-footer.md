# Phase 4d: Convert Footer

## Goal
Implement `Footer.tsx` that **exactly clones** the Figma footer design. Every element — background, layout, text, form, icons — must match.

## Input (MANDATORY)
1. `$MIGRATION_DIR/vibe-output/homepage/` — vibe_figma generated code (look at footer section)
2. `$MIGRATION_DIR/screenshots/` — visual reference
3. `themes/<name>/assets/images/` — footer icons/logos (from vibe_figma assets)

## CRITICAL: Read vibe_figma Output First

Open the vibe_figma homepage component and find the footer section. Extract exact Tailwind classes for:
- **Background color** (could be `bg-white`! NOT always dark — trust the generated code)
- Layout: flex/grid structure, column arrangement
- Logo: text element or image, exact classes
- Every text element: font, size, weight, color classes
- Form elements: input classes, button classes (icon-only? text?)
- Links: font, color, hover classes

**Copy the Tailwind classes from vibe_figma directly** — they match the Figma design pixel-perfectly. Only adapt the structure for CMS integration.
- Social icons: which ones, size, color
- Bottom bar: copyright text, separator style
- Padding: section, inner elements

## CRITICAL: Do NOT assume dark footer

Many designs have WHITE or LIGHT footers. The Figma might show:
- `background: #FFFFFF` (white)
- `text: #475569` (dark gray on light bg)

Do NOT default to `bg-gray-900 text-gray-300`. Read the EXACT tokens.

## Conversion Process

### Step 1: Map exact footer layout from tokens

Example — if design-tokens.md says:
```
Footer bg: #FFFFFF, padding 48px vertical
Layout: 2 columns (left: logo+form, right: contact)
Logo: "alcoris." Inter 20px bold #1A1A2E
Email input: border 1px #D1D5DB, rounded-md, h-40px
Submit: icon-only arrow, bg #2563EB, rounded-full, 40x40px
Contact: "alcoris Treuhand GmbH" 16px bold, address, email as links
Bottom: copyright 12px #94A3B8, border-t 1px #E5E7EB
```

Then code MUST be:
```tsx
<footer className="bg-white">
  <div className="max-w-[1440px] mx-auto px-16 py-12">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Left column */}
      <div>
        <a href="/" className="text-xl font-bold text-[#1A1A2E]">alcoris.</a>
        <p className="mt-4 text-sm text-[#475569]">Stay in touch</p>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            placeholder="E-Mail Adresse"
            className="flex-1 h-10 px-4 border border-[#D1D5DB] rounded-md text-sm"
          />
          {/* Icon-only button — NOT a text button */}
          <button className="w-10 h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right column */}
      <div className="lg:text-right">
        <p className="text-base font-bold text-[#1A1A2E]">alcoris Treuhand GmbH</p>
        <p className="mt-2 text-sm text-[#475569]">Wilerstrasse 8, 3053 Bern</p>
        <a href="mailto:info@alcoris.ch" className="text-sm text-[#2563EB]">info@alcoris.ch</a>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="mt-8 pt-8 border-t border-[#E5E7EB]">
      <p className="text-xs text-[#94A3B8]">&copy; {new Date().getFullYear()} alcoris Treuhand GmbH. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</footer>
```

### Step 2: Use actual assets

- If footer has a logo image: `import footerLogo from '../assets/images/footer-logo.svg'`
- If footer has social icons: use the EXACT icons downloaded from Figma, not FontAwesome substitutes
- If footer has a background image or pattern: use the downloaded asset

## Common Mistakes to Avoid

| Mistake | Why it happens | Correct approach |
|---------|---------------|-----------------|
| Dark footer when Figma is white | Using generic "dark footer" template | Read tokens — use EXACT bg color |
| Text "Subscribe" button when Figma has arrow icon | Guessing form elements | Read tokens + screenshot — use EXACT form layout |
| Adding social icons when Figma has none | Assuming footer has socials | Only add what's in the design |
| Wrong column layout (4 cols when Figma has 2) | Using generic multi-col template | Match EXACT layout from tokens |
| Wrong text alignment | Defaulting to left | Check tokens — could be right, center |

## Verification Checklist
- [ ] Background color matches design-tokens.md EXACTLY (might be white!)
- [ ] Layout (columns, alignment) matches EXACTLY
- [ ] Logo matches (text or image, exact style)
- [ ] Every text element: correct content, font, size, weight, color
- [ ] Form elements match EXACTLY (input style, button: icon vs text, shape)
- [ ] Links: correct color, hover effect
- [ ] Bottom bar: copyright text, separator style
- [ ] Padding values match EXACTLY
- [ ] NO elements added that don't exist in Figma
- [ ] NO elements missing that DO exist in Figma
- [ ] Compare rendered output against Figma screenshot — looks identical?
