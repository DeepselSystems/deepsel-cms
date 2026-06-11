import { Modal, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { RevisionListPanel } from './RevisionListPanel.jsx';

/**
 * Mantine Modal `styles` override so the body fills the full screen and lays out
 * its two panels side by side with no default padding.
 */
const MODAL_BODY_STYLES = {
  body: { padding: 0, display: 'flex', height: '100%', overflow: 'hidden' },
};

/**
 * Full-screen revision history modal for Pages and Blog Posts.
 * Left panel shows a content preview placeholder; right panel lists revisions.
 * @param {object} props
 * @param {boolean} props.opened - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {'page'|'blog'} props.contentType - Type of content being revised
 * @param {number} props.contentId - ID of the page_content or blog_post_content row
 * @param {boolean} props.hasWritePermission - Whether the user can restore revisions
 * @param {Function} props.onContentRestored - Callback fired after a successful restore
 */
export default function RevisionsModal({
  opened,
  onClose,
  contentType,
  contentId,
  hasWritePermission = false,
  onContentRestored,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<div className="font-bold">{t('Revision History')}</div>}
      fullScreen
      size="100%"
      styles={MODAL_BODY_STYLES}
    >
      {/* Content preview area (placeholder) */}
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <Text size="xl" fw={600} c="dimmed" mb="xs">
            {t('Content Preview')}
          </Text>
          <Text size="sm" c="dimmed">
            {t('Content diff preview coming soon.')}
          </Text>
        </div>
      </div>

      {/* Revision list panel */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full overflow-hidden">
        <RevisionListPanel
          contentType={contentType}
          contentId={contentId}
          hasWritePermission={hasWritePermission}
          onContentRestored={onContentRestored}
          opened={opened}
        />
      </div>
    </Modal>
  );
}
