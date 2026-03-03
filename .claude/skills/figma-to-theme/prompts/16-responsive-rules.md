# Cross-Cutting: Responsive Design Rules

## This file is referenced by all component conversion phases.

## Mobile-First Methodology (MANDATORY)
Write base styles for mobile, then add responsive modifiers for larger screens:
```tsx
// CORRECT: mobile-first
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="px-4 sm:px-6 lg:px-8"

// WRONG: desktop-first
className="text-lg md:text-base sm:text-sm"
```

## Breakpoint Reference
| Tailwind | Pixels | Device |
|---|---|---|
| (base) | 0-639px | Mobile |
| `sm:` | 640px+ | Large mobile / Small tablet |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Small desktop |
| `xl:` | 1280px+ | Desktop |
| `2xl:` | 1536px+ | Large desktop |

## Common Responsive Patterns

### Navigation
```
Mobile: hamburger icon → slide-out menu
Desktop: horizontal nav links
Breakpoint: lg: (1024px)
```

### Grid Layouts
```
Mobile: 1 column
Tablet: 2 columns
Desktop: 3-4 columns
```
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### Typography Scaling
| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| h1 (hero) | text-2xl | text-3xl | text-5xl |
| h2 (section) | text-xl | text-2xl | text-3xl |
| h3 (card) | text-lg | text-lg | text-xl |
| body | text-sm | text-base | text-base |

### Spacing
| Context | Mobile | Desktop |
|---|---|---|
| Section padding | py-8 or py-12 | py-16 or py-24 |
| Container padding | px-4 | px-6 lg:px-8 |
| Card gap | gap-4 or gap-6 | gap-8 |
| Element margin | mt-4 | mt-6 or mt-8 |

### Layout Changes
| Mobile | Desktop |
|---|---|
| Stacked (flex-col) | Side-by-side (flex-row or grid) |
| Full width | Max-width container |
| Hidden sidebar | Visible sidebar |
| Bottom CTA bar | Inline CTA buttons |
| Stacked hero (image below text) | Split hero (side by side) |

### Visibility
```tsx
className="hidden lg:block"    // Desktop only
className="lg:hidden"           // Mobile only
className="hidden md:flex"      // Tablet and up
```

### Container Max-Widths
```tsx
className="max-w-7xl mx-auto"   // 1280px — most common
className="max-w-6xl mx-auto"   // 1152px — narrower content
className="max-w-3xl mx-auto"   // 768px — blog post / article
className="max-w-5xl mx-auto"   // 1024px — medium content
```

### Images
```tsx
// Hero: fixed aspect ratio
className="aspect-video w-full object-cover"

// Card thumbnail
className="aspect-video w-full object-cover"

// Avatar
className="w-10 h-10 rounded-full object-cover"

// Full-width image: responsive height
className="w-full h-[200px] md:h-[300px] lg:h-[400px] object-cover"
```

## Inferring Responsive from Desktop-Only Figma

When Figma only has desktop frames, apply these defaults:

| Desktop Element | Mobile Behavior |
|---|---|
| Horizontal nav (>3 items) | Hamburger menu |
| 3+ column grid | 1 column |
| 2 column grid | 1 column (stack) |
| Side-by-side hero | Stacked (text first) |
| Sidebar + content | Hide sidebar |
| Large hero (>500px) | Shorter (300-400px) |
| Fixed header | Sticky header |
| Hover effects | Touch-friendly sizes |
| Small buttons | Larger touch targets (min 44px) |
| Horizontal card | Vertical card |

## Testing Responsive Behavior
After implementation, verify at these widths:
1. 375px (iPhone SE)
2. 768px (iPad)
3. 1920px (Desktop)

Check for:
- No horizontal scrollbar at any width
- Text is readable at all sizes
- Touch targets are at least 44px on mobile
- Images don't overflow
- Navigation is accessible at all sizes
