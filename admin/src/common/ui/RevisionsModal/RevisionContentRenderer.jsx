import { useState, useEffect } from 'react';
import { Loader, ScrollArea, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { htmlDiff } from '@deepsel/cms-utils/common/utils';
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
 * Wrapper class that scopes htmlDiff <ins>/<del> styling defined in global.css.
 * Applied only when diff output is rendered.
 */
const REVISION_DIFF_CLASS = 'revision-diff-content';

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
 * Resolves the BCP-47 locale code from a revision record for use with the Jinja2 render API.
 * @param {import('../../../typedefs/Revision').ContentRevision
 *   | import('../../../typedefs/Revision').CurrentVersionItem} revision
 * @param {'page'|'blog'} type
 * @returns {string|null}
 */
function resolveLang(revision, type) {
  switch (type) {
    case 'page':
      return revision.page_content?.locale?.iso_code ?? null;
    case 'blog':
      return revision.blog_post_content?.locale?.iso_code ?? null;
    default:
      console.warn(`RevisionContentRenderer: unknown contentType "${type}", lang will be null`);
      return null;
  }
}

/**
 * Scrollable content area of the revision preview.
 * Sends the selected revision's `new_content` through the Jinja2 render API
 * (debounced, race-safe) and renders the resulting HTML. Falls back to the
 * raw `new_content` when the render API fails so the panel is never blank.
 * When `showDiff` is true and the revision is not the current version,
 * renders a word-level diff of old vs new content using htmlDiff.
 * @param {object} props
 * @param {import('../../../typedefs/Revision').ContentRevision | null} props.selectedRevision - Revision whose content is previewed
 * @param {'page'|'blog'} props.contentType - Content type, used to locate the locale for rendering
 * @param {boolean} [props.showDiff] - When true, renders a word-level diff of old vs new content.
 *   Ignored when selectedRevision.isCurrent is true.
 */
export function RevisionContentRenderer({ selectedRevision, contentType, showDiff = true }) {
  // Translation
  const { t } = useTranslation();

  // Render content API
  const { post: renderContentAPI } = useFetch(RENDER_CONTENT_ENDPOINT, {
    autoFetch: false,
  });

  // Rendered HTML for the current selection
  const [renderedContent, setRenderedContent] = useState(/** @type {string|null} */ null);

  // Whether a render request is pending for the current selection.
  // Initialized from the selection so the first paint shows the loader
  // instead of flashing the empty state before the effect fires.
  const [isRendering, setIsRendering] = useState(
    /** @type {boolean} */ Boolean(selectedRevision?.new_content),
  );

  // Whether the currently displayed content is a diff (controls .revision-diff-content wrapper)
  const [isDiff, setIsDiff] = useState(/** @type {boolean} */ false);

  /** Render the selected revision's content through the Jinja2 API (debounced, race-safe) */
  useEffect(() => {
    // Nothing to render
    if (!selectedRevision?.new_content) {
      setRenderedContent(null);
      setIsRendering(false);
      setIsDiff(false);
      return undefined;
    }

    // Show the spinner immediately on selection change
    setIsRendering(true);
    // Clear stale content so renderedContent and isRendering are independently correct
    setRenderedContent(null);
    setIsDiff(false);

    // Guard against out-of-order responses from rapid selection changes
    let cancelled = false;

    const timer = setTimeout(async () => {
      const lang = resolveLang(selectedRevision, contentType);
      const org = selectedRevision.organization_id ?? null;

      /** Renders a single HTML string through the Jinja2 API; falls back to raw input on failure. */
      const renderOne = async (content) => {
        const resp = await renderContentAPI({
          content,
          name: `${RENDER_PREVIEW_NAME_PREFIX}_${Date.now()}_${Math.random()}`,
          organization_id: org,
          lang,
        });
        return resp?.rendered_content != null ? resp.rendered_content : content;
      };

      const shouldDiff =
        showDiff && !selectedRevision.isCurrent && Boolean(selectedRevision.new_content);

      if (!shouldDiff) {
        // Existing behavior: render new_content only
        let result = selectedRevision.new_content;
        try {
          result = await renderOne(selectedRevision.new_content);
        } catch (error) {
          console.error('Error rendering revision content:', error);
        }
        if (!cancelled) {
          setRenderedContent(result);
          setIsDiff(false);
          setIsRendering(false);
        }
        return;
      }

      const oldRaw = selectedRevision.old_content ?? '';

      // Revision #1 has no meaningful baseline: old_content is whatever the page
      // had before the very first publish (often seed/default content that equals
      // new_content). Treat it as "published from nothing" — show everything green.
      const isFirstRevision = selectedRevision.revision_number === 1;

      if (oldRaw === '' || isFirstRevision) {
        // No baseline (or first ever publish) — render new only, diff '' vs renderedNew (all-<ins>)
        let renderedNew = selectedRevision.new_content;
        try {
          renderedNew = await renderOne(selectedRevision.new_content);
        } catch (error) {
          console.error('Error rendering revision content:', error);
        }
        if (!cancelled) {
          setRenderedContent(htmlDiff('', renderedNew));
          setIsDiff(true);
          setIsRendering(false);
        }
        return;
      }

      // Normal diff: render both in parallel, fallback gracefully on partial failure
      const [oldResult, newResult] = await Promise.allSettled([
        renderOne(oldRaw),
        renderOne(selectedRevision.new_content),
      ]);

      if (!cancelled) {
        if (newResult.status === 'rejected') {
          // new render failed → raw fallback, no diff
          console.error('Error rendering new_content:', newResult.reason);
          setRenderedContent(selectedRevision.new_content);
          setIsDiff(false);
        } else if (oldResult.status === 'rejected') {
          // old render failed → show plain new, no diff
          console.error('Error rendering old_content:', oldResult.reason);
          setRenderedContent(newResult.value);
          setIsDiff(false);
        } else {
          setRenderedContent(htmlDiff(oldResult.value, newResult.value));
          setIsDiff(true);
        }
        setIsRendering(false);
      }
    }, RENDER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // renderContentAPI: useFetch recreates fn on each render but POST body is built fresh at call time.
    // contentType: string literal at all call sites, never changes at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedRevision?.id,
    selectedRevision?.new_content,
    selectedRevision?.old_content,
    selectedRevision?.isCurrent,
    showDiff,
  ]);

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
        {renderedContent !== null ? (
          <div
            className={clsx(PROSE_CLASSES, isDiff && REVISION_DIFF_CLASS)}
            // Rendering trusted CMS content from the same origin
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
