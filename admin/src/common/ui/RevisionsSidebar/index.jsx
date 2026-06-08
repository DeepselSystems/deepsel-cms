import { useState } from 'react';
import { ActionIcon, Group, ScrollArea, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconX } from '@tabler/icons-react';
import clsx from 'clsx';

/**
 * Filter options for the revision list.
 * 'all' shows every revision; 'named' shows only revisions with a custom name.
 */
const REVISION_FILTER_ALL = 'all';
const REVISION_FILTER_NAMED = 'named';

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
  const [filter, setFilter] = useState(REVISION_FILTER_ALL);

  const filterOptions = [
    { value: REVISION_FILTER_ALL, label: t('All versions') },
    { value: REVISION_FILTER_NAMED, label: t('Named versions only') },
  ];

  const visibleRevisions =
    filter === REVISION_FILTER_NAMED ? revisions.filter((r) => r.name) : revisions;

  if (!opened) return null;

  return (
    <div className={clsx('bg-gray-50 border-l flex flex-col flex-shrink-0 w-96', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <Group justify="space-between" mb="sm">
          <Text fw={700} size="lg">
            {t('Revision History')}
          </Text>
          <ActionIcon variant="subtle" color="gray" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
        <Select
          data={filterOptions}
          value={filter}
          onChange={setFilter}
          rightSection={<IconChevronDown size={14} />}
          comboboxProps={{ shadow: 'sm' }}
        />
      </div>

      {/* Revision list */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {visibleRevisions.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" className="mt-8">
            {filter === REVISION_FILTER_NAMED
              ? t('No named versions yet.')
              : t('No revisions yet. Revisions are created each time you publish.')}
          </Text>
        ) : (
          <div className="py-2">{/* Revision items will be rendered here */}</div>
        )}
      </ScrollArea>
    </div>
  );
}
