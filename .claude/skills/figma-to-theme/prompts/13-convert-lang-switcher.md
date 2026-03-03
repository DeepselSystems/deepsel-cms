# Phase 4j: Convert Language Switcher

## Goal
Implement `LangSwitcher.tsx` for multi-language support. This is always created (required component) but styling matches the Figma design.

## Input
- Screenshots showing language switcher (if visible in design)
- If not visible in Figma: use a minimal floating button style

## Pattern

```tsx
import { useLanguage } from '@deepsel/cms-react';
import { useWebsiteData } from '@deepsel/cms-react';

export default function LangSwitcher() {
  const { websiteData } = useWebsiteData();
  const { currentLang, switchLanguage, availableLanguages } = useLanguage();

  if (!availableLanguages || availableLanguages.length <= 1) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <div className="relative group">
        <button className="bg-white shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border transition-colors">
          {currentLang?.toUpperCase() || 'EN'}
        </button>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <div className="bg-white rounded-lg shadow-lg border py-1 min-w-[120px]">
            {availableLanguages.map((lang) => (
              <button
                key={lang.iso_code}
                onClick={() => switchLanguage(lang.iso_code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  lang.iso_code === currentLang ? 'text-primary-600 font-medium' : 'text-gray-700'
                }`}
              >
                {lang.name || lang.iso_code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Placement Options (match Figma)
- **Floating bottom-right** (default): `fixed bottom-4 right-4 z-30`
- **In header**: integrate into the header component instead of fixed positioning
- **In footer**: integrate into the footer
- **Dropdown in nav**: part of the desktop navigation

## Checklist
- [ ] Shows current language
- [ ] Lists available languages on hover/click
- [ ] `switchLanguage()` called correctly
- [ ] Hidden when only one language available
- [ ] Positioned per Figma design (or floating as fallback)
- [ ] z-index doesn't conflict with other elements
