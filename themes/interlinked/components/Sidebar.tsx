import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useWebsiteData } from '@deepsel/cms-react';
import { isActiveMenu, type MenuItem } from '@deepsel/cms-utils';

interface SidebarMenuItemProps {
  item: MenuItem;
  level: number;
}

function SidebarMenuItem({ item, level }: SidebarMenuItemProps) {
  const { websiteData } = useWebsiteData();
  const hasChildren = !!item.children && item.children.length > 0;
  const hasUrl = !!item.url;
  const [expanded, setExpanded] = useState(true);
  const isActive = isActiveMenu(item, websiteData!);

  // Calculate indentation based on level
  const paddingLeft = `${level * 1 + 0.5}rem`;

  // Category style (no URL) - bold text
  const categoryClass = !hasUrl ? 'font-bold text-gray-900' : '';
  
  // Active link style
  const activeClass = isActive && hasUrl ? 'text-primary-600 bg-primary-50' : '';
  
  // Hover style for links
  const hoverClass = hasUrl ? 'hover:bg-gray-100 hover:text-primary-600' : '';

  const handleClick = () => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div className="">
      <div
        className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors rounded ${categoryClass} ${activeClass} ${hoverClass}`}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {hasUrl ? (
          <a
            href={item.url || '#'}
            className="flex-1"
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
              }
            }}
          >
            {item.title}
          </a>
        ) : (
          <span className="flex-1">{item.title}</span>
        )}
        
        {hasChildren && (
          <FontAwesomeIcon
            icon={faChevronRight}
            className={`text-gray-500 transition-transform duration-100 ${expanded ? 'rotate-90' : 'rotate-0'}`}
          />
        )}
      </div>
      
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-100 ease-in-out ${
            expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {item.children?.map((child) => (
            <SidebarMenuItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { websiteData } = useWebsiteData();
  const menus = websiteData?.settings?.menus;

  if (!menus || menus.length === 0) {
    return null;
  }

  return (
    <aside className="w-64 bg-white overflow-y-auto sticky top-[60px] h-[calc(100vh-60px)] shrink-0">
      <nav className="p-4">
        {menus.map((menu) => (
          <SidebarMenuItem key={menu.id} item={menu} level={0} />
        ))}
      </nav>
    </aside>
  );
}
