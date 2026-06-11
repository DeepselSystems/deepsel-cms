import { ScrollArea, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

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
 * Left panel of RevisionsModal.
 * Renders the `new_content` HTML of the selected revision as raw HTML.
 * Shows a placeholder when no revision is selected.
 * @param {object} props
 * @param {import('../../../typedefs/Revision').ContentRevision|null} props.selectedRevision
 */
export function ContentPreviewPanel({ selectedRevision }) {
  const { t } = useTranslation();

  if (!selectedRevision) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <Text size="xl" fw={600} c="dimmed" mb="xs">
            {t('Content Preview')}
          </Text>
          <Text size="sm" c="dimmed">
            {t('Select a revision on the right to preview its content.')}
          </Text>
        </div>
      </div>
    );
  }

  const authorName = selectedRevision.owner
    ? `${selectedRevision.owner.first_name ?? ''} ${selectedRevision.owner.last_name ?? ''}`.trim() ||
      selectedRevision.owner.username
    : t('Unknown');
  const timestamp = dayjs
    .utc(selectedRevision.created_at)
    .local()
    .format('MMM D, YYYY [at] h:mm A');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview header: unnamed → timestamp as title; named → name as title + timestamp below */}
      <div className="flex-shrink-0 px-8 py-4 border-b border-gray-200 bg-white">
        <Text fw={700} size="md">
          {selectedRevision.name ?? timestamp}
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          {selectedRevision.name ? `${authorName} · ${timestamp}` : authorName}
        </Text>
      </div>

      {/* Rendered HTML content */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-6">
          {selectedRevision.new_content ? (
            <div
              className={PROSE_CLASSES}
              // Rendering trusted CMS content from the same origin
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: selectedRevision.new_content }}
            />
          ) : (
            <Text size="sm" c="dimmed" ta="center" mt="xl">
              {t('No content available for this revision.')}
            </Text>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
