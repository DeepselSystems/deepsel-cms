import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faExpand,
  faCompress,
} from '@fortawesome/free-solid-svg-icons';
import useSidebar from '../../hooks/useSidebar.js';
import Button from '../Button.jsx';

/**
 * Example component showing how to control the sidebar from any component
 */
export default function SidebarControls({variant = 'buttons'}) {
  const {isCollapsed, toggle, collapse, expand} = useSidebar();

  if (variant === 'single') {
    return (
      <Button
        onClick={toggle}
        variant="outline"
        size="sm"
        leftSection={
          <FontAwesomeIcon
            icon={isCollapsed ? faChevronRight : faChevronLeft}
          />
        }
      >
        {isCollapsed ? 'Expand' : 'Collapse'} Sidebar
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        className="p-2 rounded hover:bg-gray-100 transition-colors"
        title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar`}
      >
        <FontAwesomeIcon
          icon={isCollapsed ? faExpand : faCompress}
          className="h-4 w-4"
        />
      </button>
    );
  }

  // Default: separate buttons
  return (
    <div className="flex gap-2">
      <Button
        onClick={collapse}
        variant="outline"
        size="sm"
        disabled={isCollapsed}
        leftSection={<FontAwesomeIcon icon={faCompress} />}
      >
        Collapse
      </Button>
      <Button
        onClick={expand}
        variant="outline"
        size="sm"
        disabled={!isCollapsed}
        leftSection={<FontAwesomeIcon icon={faExpand} />}
      >
        Expand
      </Button>
    </div>
  );
}
