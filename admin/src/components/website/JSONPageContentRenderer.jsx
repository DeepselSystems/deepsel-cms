import {useMemo, useEffect, useRef} from 'react';
import {
  containsYouTubeJumpMarks,
  initializeYouTubeJumpMarks,
} from '../../common/ui/tiptap-extensions/youtube-jumpmarks-extension/utils.js';

export default function JSONPageContentRenderer({content}) {
  const containerRef = useRef(null);

  // Recursive content renderer for JSON content
  const renderContent = useMemo(() => {
    const render = (content, level = 0) => {
      if (!content || typeof content !== 'object') {
        return null;
      }

      return Object.entries(content)
        .map(([key, value]) => {
          // Skip special ds-* attributes in rendering, except ds-type
          if (key.startsWith('ds-') && key !== 'ds-type') {
            return null;
          }

          const label = value?.['ds-label'] || key;
          const type = value?.['ds-type'];
          const contentValue = value?.['ds-value'];

          // Check if this is a container (object without ds-value)
          const isContainer =
            typeof value === 'object' &&
            value !== null &&
            !value.hasOwnProperty('ds-value') &&
            !type;

          if (type === 'wysiwyg') {
            return (
              <div
                key={key}
                data-content-key={key}
                data-content-type={type}
                data-content-label={label}
                dangerouslySetInnerHTML={{
                  __html: contentValue || '',
                }}
              />
            );
          }

          return (
            <div
              key={key}
              data-content-key={key}
              data-content-type={type || 'container'}
              data-content-label={label}
              className={level === 0 ? 'mb-8' : 'mb-4'}
            >
              {isContainer ? (
                // Is Container - render children recursively
                <div>{render(value, level + 1)}</div>
              ) : typeof value === 'string' ? (
                // Is String - render as text
                <div>{value}</div>
              ) : contentValue !== undefined ? (
                // Is Object with ds-value - render as text
                <div>{contentValue}</div>
              ) : null}
            </div>
          );
        })
        .filter(Boolean);
    };

    return render;
  }, []);

  // Initialize YouTube jump marks after content is rendered
  useEffect(() => {
    if (containerRef.current) {
      // Check if any content contains YouTube jump marks
      const hasYouTubeJumpMarks =
        containerRef.current.innerHTML &&
        containsYouTubeJumpMarks(containerRef.current.innerHTML);

      if (hasYouTubeJumpMarks) {
        initializeYouTubeJumpMarks(containerRef.current);
      }
    }
  }, [content]);

  if (!content || typeof content !== 'object') {
    return null;
  }

  return (
    <div ref={containerRef} className="prose prose-lg max-w-none">
      {renderContent(content)}
    </div>
  );
}
