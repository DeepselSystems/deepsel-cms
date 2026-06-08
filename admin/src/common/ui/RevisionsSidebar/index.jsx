import { useState } from 'react';
import { ActionIcon, Group, ScrollArea, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconX, IconHistory } from '@tabler/icons-react';
import clsx from "clsx";

/**
 * Sidebar panel showing revision history for Pages and Blog Posts.
 * Shared component — works for both content types.
 * @param {object} props
 * @param {boolean} props.opened - Whether the sidebar is visible
 * @param {Function} props.onClose - Callback to close the sidebar
 * @param {Array} props.revisions - List of revision records
 * @param {'page'|'blog'|'template'} props.contentType - Type of content being reviewed (template not yet implemented)
 * @param {number} props.contentId - ID of the content record
 * @param {boolean} props.hasWritePermission - Whether the user can restore revisions
 * @param {Function} props.onContentRestored - Callback fired after a successful restore
 * @param {string} props.className - Additional CSS classes to apply to the sidebar
 */
export default function RevisionsSidebar({
  opened,
  onClose,
  revisions = [],
  contentType,
  contentId,
  hasWritePermission = false,
  onContentRestored,
  className = '',
}) {
  // Translations
  const { t } = useTranslation();

  // Initialize state
  const [selectedRevisionId, setSelectedRevisionId] = useState(null);

  if (!opened) return null;

  return (
    <div className={clsx('bg-white border-l flex flex-col flex-shrink-0 w-96', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <Group justify="space-between">
          <Group gap="xs">
            <IconHistory size={18} className="text-gray-500" />
            <Text fw={700} size="lg">
              {t('Revision History')}
            </Text>
          </Group>
          <ActionIcon variant="subtle" color="gray" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </div>

      {/* Revision list */}
      <ScrollArea className="flex-1">
        {revisions.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" className="mt-8 px-4">
            {t('No revisions yet. Revisions are created each time you publish.')}
          </Text>
        ) : (
          <div className="py-2">{/* Revision items will be rendered here */}</div>
        )}
      </ScrollArea>
    </div>
  );
}
