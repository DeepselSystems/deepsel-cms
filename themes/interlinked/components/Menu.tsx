import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { usePageData } from '@deepsel/cms-react';
import { isActiveMenu } from '@deepsel/cms-utils';
import type { MenuItem } from '@deepsel/cms-utils';





interface RecursiveMenuItemProps {
  item: MenuItem;
  level: number;
}

function RecursiveMenuItem({ item, level }: RecursiveMenuItemProps) {
  const hasChildren = !!item.children && item.children.length > 0;
  const [expanded, setExpanded] = useState(false);

  const indentClass = level === 0 ? '' : level === 1 ? 'pl-2' : level === 2 ? 'pl-4' : 'pl-6';

  return (
    <li className="w-full">
      <div
        className="flex items-center justify-between w-full px-3 py-1 hover:bg-primary-100 cursor-pointer"
        onClick={() => {
          if (hasChildren) {
            setExpanded((prev) => !prev);
          }
        }}
      >
        <a
          href={item.url || '#'}
          className="flex-1 text-left"
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
            }
          }}
        >
          <span className={indentClass}>{item.title}</span>
        </a>
        {hasChildren && (
          <button
            type="button"
            className="ml-2 text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            <FontAwesomeIcon icon={expanded ? faCaretDown : faCaretRight} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="w-full">
          {item.children?.map((child) => (
            <RecursiveMenuItem key={child.id} item={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface TopLevelMenuItemProps {
  item: MenuItem;
  isActive: boolean;
}

function TopLevelMenuItem({ item, isActive }: TopLevelMenuItemProps) {
  const hasChildren = !!item.children && item.children.length > 0;
  const hightlightClass = isActive ? 'border-b-primary-600' : 'border-b-transparent hover:border-b-primary-600';

  if (!hasChildren) {
    return (
      <li className={`relative py-4 border-b-4 ${hightlightClass}`}>
        <a href={item.url || '#'} className="px-2 py-1 hover:text-primary-600 transition-colors duration-200">
          {item.title}
        </a>
      </li>
    );
  }

  return (
    <li className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 hover:text-primary-600 transition-colors duration-200"
      >
        <span>{item.title}</span>
        <FontAwesomeIcon icon={faCaretDown} className="text-xs" />
      </button>
      <div className="absolute left-0 mt-0 hidden min-w-[160px] rounded bg-white py-2 border border-primary-200 shadow-lg group-hover:block z-20">
        <ul className="w-full">
          {item.children?.map((child) => (
            <RecursiveMenuItem key={child.id} item={child} level={1} />
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function Menu() {
  const { pageData } = usePageData();

  const menus = pageData?.public_settings?.menus;

  return (
    <ul className="flex gap-4 items-center">
      {menus?.map((menu) => (
        <TopLevelMenuItem key={menu.id} item={menu} isActive={isActiveMenu(menu, pageData!)} />
      ))}
    </ul>
  );
}
