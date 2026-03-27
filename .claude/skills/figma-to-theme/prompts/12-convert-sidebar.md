# Phase 4i: Convert Sidebar

## Goal
Implement `Sidebar.tsx` if the Figma design includes a sidebar navigation. Skip this phase if no sidebar is present in the design.

## Input
- Screenshots showing sidebar (if present)
- `$MIGRATION_DIR/design-map.md` — sidebar description
- Design data for sidebar layout

## When to Create a Sidebar
- The design shows a left/right panel with page navigation links
- The design has a tree-style navigation for documentation or nested content
- The design has a persistent side panel with filters or categories

If the design has NO sidebar, skip this phase entirely.

## Pattern

```tsx
import { useState } from 'react';
import { useWebsiteData } from '@deepsel/cms-react';
import { isActiveMenu } from '@deepsel/cms-utils';

export default function Sidebar() {
  const { websiteData } = useWebsiteData();

  // Use CMS menus for sidebar if available
  const sidebarMenus = websiteData?.settings?.menus || [];

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 hidden lg:block">
      <nav className="sticky top-20 p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
        {sidebarMenus.map((item) => (
          <SidebarItem key={item.id} item={item} depth={0} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({ item, depth }: { item: MenuItem; depth: number }) {
  const { websiteData } = useWebsiteData();
  const [isExpanded, setIsExpanded] = useState(isActiveMenu(item, websiteData));
  const hasChildren = item.children && item.children.length > 0;
  const active = isActiveMenu(item, websiteData);

  return (
    <div>
      <div className="flex items-center">
        <a
          href={item.url}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
            active
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={{ paddingLeft: `${(depth * 12) + 12}px` }}
        >
          {item.title}
        </a>
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <SidebarItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Integration in Page.tsx Layout
```tsx
<div className="flex flex-1">
  <Sidebar />
  <main className="flex-1 min-w-0">
    {/* page content */}
  </main>
</div>
```

## Responsive Rules
- Desktop: sidebar visible as side panel
- Mobile: sidebar hidden (`hidden lg:block`)
- Mobile alternative: slide-out drawer triggered by a button, or moved to top as horizontal tabs

## Checklist
- [ ] Sidebar matches Figma design (if present)
- [ ] Tree navigation supports expand/collapse
- [ ] Active state highlighting with `isActiveMenu()`
- [ ] Sticky positioning so sidebar scrolls independently
- [ ] Hidden on mobile, visible on desktop
- [ ] Proper max-height with overflow scroll
