import React, { useMemo, useEffect, useRef } from 'react';
import {
  containsYouTubeJumpMarks,
  initializeYouTubeJumpMarks,
} from './extensions/youtube-jumpmarks-extension/utils';
import {
  containsEnhancedImages,
  initializeEnhancedImages,
} from './extensions/enhanced-image-extension/utils';
import {
  containsEnhancedCodeBlocks,
  initializeEnhancedCodeBlocks,
} from './extensions/enhanced-code-block-extension/utils';
import {
  containsJinja2InRenderedContent,
  initializeJinja2InRenderedContent,
} from './extensions/jinja2-markdown-extension/utils';

interface ContentValue {
  'ds-label'?: string;
  'ds-type'?: string;
  'ds-value'?: string;
  [key: string]: unknown;
}

type ContentObject = Record<string, ContentValue | string>;

export interface JSONPageContentRendererProps {
  content: ContentObject | null;
}

/**
 * Renders JSON page content with support for WYSIWYG, containers, and enhanced features
 */
export const JSONPageContentRenderer = ({ content }: JSONPageContentRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Recursive content renderer for JSON content
  const renderContent = useMemo(() => {
    const render = (content: ContentObject, level: number = 0): (React.ReactElement | null)[] => {
      if (!content || typeof content !== 'object') {
        return [];
      }

      return Object.entries(content)
        .map(([key, value]) => {
          // Skip special ds-* attributes in rendering, except ds-type
          if (key.startsWith('ds-') && key !== 'ds-type') {
            return null;
          }

          const label =
            (typeof value === 'object' && value !== null ? value['ds-label'] : undefined) || key;
          const type = typeof value === 'object' && value !== null ? value['ds-type'] : undefined;
          const contentValue =
            typeof value === 'object' && value !== null ? value['ds-value'] : undefined;

          // Check if this is a container (object without ds-value)
          const isContainer =
            typeof value === 'object' &&
            value !== null &&
            !Object.prototype.hasOwnProperty.call(value, 'ds-value') &&
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
                <div>{render(value as ContentObject, level + 1)}</div>
              ) : typeof value === 'string' ? (
                // Is String - render as text
                <div>{value}</div>
              ) : contentValue !== undefined ? (
                // Is Object with ds-value - render as text
                <div>{String(contentValue)}</div>
              ) : null}
            </div>
          );
        })
        .filter((item): item is React.ReactElement => item !== null);
    };

    return render;
  }, []);

  // Initialize YouTube jump marks after content is rendered
  useEffect(() => {
    if (containerRef.current) {
      // Check if any content contains YouTube jump marks
      const hasYouTubeJumpMarks =
        containerRef.current.innerHTML && containsYouTubeJumpMarks(containerRef.current.innerHTML);

      if (hasYouTubeJumpMarks) {
        initializeYouTubeJumpMarks(containerRef.current);
      }

      // Initialize enhanced images after content is rendered
      const hasEnhancedImages = containsEnhancedImages(containerRef.current);

      if (hasEnhancedImages) {
        initializeEnhancedImages(containerRef.current);
      }

      // Initialize enhanced code blocks after content is rendered
      const hasEnhancedCodeBlocks = containsEnhancedCodeBlocks(containerRef.current);

      if (hasEnhancedCodeBlocks) {
        initializeEnhancedCodeBlocks(containerRef.current);
      }

      // Initialize Jinja2 syntax highlighting in rendered content
      const hasJinja2 = containsJinja2InRenderedContent(containerRef.current);
      if (hasJinja2) {
        initializeJinja2InRenderedContent(containerRef.current);
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
};
