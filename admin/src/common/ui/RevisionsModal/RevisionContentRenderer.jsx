import { useState, useEffect } from 'react';
import { Loader, ScrollArea, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useFetch from '../../api/useFetch.js';

/**
 * Backend endpoint that renders Jinja2 expressions inside content HTML.
 */
const RENDER_CONTENT_ENDPOINT = 'template_content/render';

/**
 * Delay before firing the render API after a revision is selected,
 * so rapid clicks through the revision list don't spam the backend.
 */
const RENDER_DEBOUNCE_MS = 300;

/**
 * Prefix for the throwaway `name` sent to the render endpoint;
 * combined with timestamp + random suffix to stay unique per request.
 */
const RENDER_PREVIEW_NAME_PREFIX = 'revision_preview';

/**
 * Prose container class for rendering TipTap HTML output.
 * Mirrors the styles used in the public content renderer.
 */
const PROSE_CLASSES = clsx(
  'prose prose-sm max-w-none',
  'prose-headings:font-semibold prose-headings:text-gray-900',
  'prose-p:text-gray-700 prose-p:leading-relaxed',
  'prose-a:text-blue-600 prose-a:underline',
  'prose-ul:list-disc prose-ol:list-decimal',
  'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic',
  'prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-sm',
  'prose-img:rounded-md prose-img:max-w-full',
);

/**
 * Scrollable content area of the revision preview.
 * Sends the selected revision's `new_content` through the Jinja2 render API
 * (debounced, race-safe) and renders the resulting HTML. Falls back to the
 * raw `new_content` when the render API fails so the panel is never blank.
 * @param {object} props
 * @param {import('../../../typedefs/Revision').ContentRevision
 *   | import('../../../typedefs/Revision').CurrentVersionItem
 *   | null} props.selectedRevision - Revision whose content is previewed
 * @param {'page'|'blog'} props.contentType - Content type, used to locate the locale for rendering
 */
export function RevisionContentRenderer({ selectedRevision, contentType }) {
  // Translation
  const { t } = useTranslation();

  // Render content API
  const { post: renderContentAPI } = useFetch(RENDER_CONTENT_ENDPOINT, {
    autoFetch: false,
  });

  // Rendered HTML for the current selection
  const [renderedContent, setRenderedContent] = useState(/** @type {string|null} */ null);

  // Whether a render request is pending for the current selection
  const [isRendering, setIsRendering] = useState(false);

  /** Render the selected revision's content through the Jinja2 API (debounced, race-safe) */
  useEffect(() => {
    // Nothing to render
    if (!selectedRevision?.new_content) {
      setRenderedContent(null);
      setIsRendering(false);
      return undefined;
    }

    // Show the spinner immediately on selection change
    setIsRendering(true);

    // Guard against out-of-order responses from rapid selection changes
    let cancelled = false;

    const timer = setTimeout(async () => {
      // Fallback is the raw content so the panel is never blank
      let result = selectedRevision.new_content;

      // Locale of the parent content row, per content type.
      // switch/case so adding a new content type is one case addition.
      let lang;
      switch (contentType) {
        case 'page':
          lang = selectedRevision.page_content?.locale?.iso_code ?? null;
          break;
        case 'blog':
          lang = selectedRevision.blog_post_content?.locale?.iso_code ?? null;
          break;
        default:
          lang = null;
      }

      try {
        const renderResponse = await renderContentAPI({
          content: selectedRevision.new_content,
          name: `${RENDER_PREVIEW_NAME_PREFIX}_${Date.now()}_${Math.random()}`,
          organization_id: selectedRevision.organization_id ?? null,
          lang,
        });
        result = renderResponse?.rendered_content ?? result;
      } catch (error) {
        console.error('Error rendering revision content:', error);
      }

      if (!cancelled) {
        setRenderedContent(result);
        setIsRendering(false);
      }
    }, RENDER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRevision]);

  // Pending render request
  if (isRendering) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader size="sm" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-8 py-6">
        {renderedContent ? (
          <div
            className={PROSE_CLASSES}
            // Rendering trusted CMS content from the same origin
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <Text size="sm" c="dimmed" ta="center" mt="xl">
            {t('No content available for this revision.')}
          </Text>
        )}
      </div>
    </ScrollArea>
  );
}
