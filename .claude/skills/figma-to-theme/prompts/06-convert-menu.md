# Phase 4c: Convert Menu (Desktop + Mobile)

## Goal
Implement `Menu.tsx` that **exactly clones** the navigation from Figma. Link text, colors, spacing, active states, hover effects must all match the design tokens.

## Input (MANDATORY)
1. `$MIGRATION_DIR/vibe-output/homepage/` — vibe_figma generated code (look at nav/menu section)
2. `$MIGRATION_DIR/design-map.md` — menu items found in design
3. `$MIGRATION_DIR/screenshots/` — visual reference for desktop and mobile nav

## CRITICAL: Extract EXACT menu styling from vibe_figma output

Before coding, read the vibe_figma homepage component and find the navigation section. Note the exact Tailwind classes for:
- Menu item font family, size, weight, color
- Gap between menu items (e.g., `gap-8`)
- Active/hover state classes (if visible in the static output)
- Container styling
- Any dropdown/submenu elements

Also check the mobile variant (if vibe_figma was run on a mobile frame) for mobile menu styling. If no mobile variant exists, implement hamburger menu based on the desktop nav styling.

## Hardcoded Design Menu Items

Extract the ACTUAL menu item text and URLs visible in the Figma screenshots:

```tsx
// Default menu items — EXACTLY as shown in the Figma design
const designMenuItems: MenuItem[] = [
  { id: 1, title: 'Finanz- und Rechnungswesen', url: '/finanz-rechnungswesen', position: 0, open_in_new_tab: false, children: [] },
  { id: 2, title: 'Unternehmensberatung', url: '/unternehmensberatung', position: 1, open_in_new_tab: false, children: [] },
  // ... EXACT text from Figma, not made up
];
```

**CMS override:**
```tsx
const menus = websiteData?.settings?.menus?.length
  ? websiteData.settings.menus
  : designMenuItems;
```

## Desktop Navigation — EXACT Style Match

Read design-tokens.md for these specific values:
```tsx
// Example: if tokens say links are Inter 14px medium #4A4A68, gap 32px
<nav className="hidden lg:flex items-center gap-8">
  {menus.map((item) => (
    <a
      key={item.id}
      href={item.url}
      className={`text-sm font-medium transition-colors ${
        isActiveMenu(item, websiteData)
          ? 'text-[#1A1A2E] border-b-2 border-[#1A1A2E] pb-1'  // EXACT active style from tokens
          : 'text-[#4A4A68] hover:text-[#1A1A2E]'              // EXACT default + hover from tokens
      }`}
    >
      {item.title}
    </a>
  ))}
</nav>
```

**Do NOT use generic styles like `text-gray-700 hover:text-primary-600`.** Use the EXACT hex values from design-tokens.md.

## Mobile Navigation — Match Figma Mobile Frame

If Figma has a mobile frame showing the menu:
- Match the exact slide-out style (left? right? full-screen?)
- Match the exact background color
- Match the exact link styling in mobile view
- Match the close button position and style

```tsx
function MobileNav({ menus }: { menus: MenuItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      {/* Hamburger — match Figma icon style */}
      <button onClick={() => setIsOpen(!isOpen)} className="p-2" aria-label="Menu">
        {/* Use EXACT icon style from Figma — bars, dots, or custom */}
        <svg className="w-6 h-6 text-[EXACT_COLOR_FROM_TOKENS]" ...>
          {/* hamburger lines */}
        </svg>
      </button>

      {/* Overlay + Panel — match Figma mobile nav */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-[280px] bg-[EXACT_BG_FROM_TOKENS] z-50 transform transition-transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Links — match mobile nav styling from tokens */}
      </div>
    </div>
  );
}
```

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---------|-----------------|
| Using `text-gray-700` when Figma has `#4A4A68` | Use `text-[#4A4A68]` |
| Using underline active when Figma uses color-only | Match exact active state from tokens |
| Making up menu items like "Home, About, Contact" | Extract exact text from Figma screenshot |
| Generic hamburger icon | Match the exact icon style in Figma |
| Standard 280px slide-out when Figma shows full-width | Match Figma mobile frame exactly |

## Verification Checklist
- [ ] Menu item text matches Figma EXACTLY (correct language, correct text)
- [ ] Menu link font family, size, weight match design-tokens.md
- [ ] Menu link color (default, hover, active) matches EXACTLY
- [ ] Gap between links matches EXACTLY
- [ ] Active state styling matches EXACTLY (underline? color? background?)
- [ ] Dropdown styling matches (if design has dropdowns)
- [ ] Mobile hamburger icon style matches
- [ ] Mobile nav panel styling matches Figma mobile frame
- [ ] CMS menus override design defaults when available
