import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { RevisionContentRenderer } from './RevisionContentRenderer.jsx';

/**
 * Left panel of RevisionsModal.
 * Shows the selected revision's header (name, timestamp, author) and delegates
 * content rendering (Jinja2 render API + HTML diff output) to RevisionContentRenderer.
 * Shows a placeholder when no revision is selected.
 * @param {object} props
 * @param {import('../../../typedefs/Revision').ContentRevision | null} props.selectedRevision
 * @param {'page'|'blog'} props.contentType - Content type, forwarded to the content renderer
 * @param {boolean} props.showDiff - Whether diff highlighting is active (owned by RevisionsModal)
 */
export function ContentPreviewPanel({ selectedRevision, contentType, showDiff }) {
  // Translation
  const { t } = useTranslation();

  // No revision selected
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

  // Author name
  const authorName = selectedRevision.owner
    ? `${selectedRevision.owner.first_name ?? ''} ${selectedRevision.owner.last_name ?? ''}`.trim() ||
      selectedRevision.owner.username
    : t('Unknown');

  // Timestamp
  const timestamp = dayjs
    .utc(selectedRevision.created_at)
    .local()
    .format('MMM D, YYYY [at] h:mm A');

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Preview header */}
      <div className="flex-shrink-0 px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-0.5">
          <Text fw={700} size="md">
            {selectedRevision.name ?? timestamp}
          </Text>
        </div>
        <Text size="xs" c="dimmed">
          {selectedRevision.name ? `${authorName} · ${timestamp}` : authorName}
        </Text>
      </div>

      {/* Rendered content (Jinja2-processed HTML, optionally with diff highlighting) */}
      <RevisionContentRenderer
        selectedRevision={selectedRevision}
        contentType={contentType}
        showDiff={showDiff}
      />
    </div>
  );
}
