import { useState } from 'react';
import { ActionIcon, Group, Loader, ScrollArea, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import useModel from '../../api/useModel.jsx';

/**
 * Maps the public contentType prop to the backend model/resource name.
 * Used to resolve which useModel endpoint to call.
 */
const MODEL_BY_CONTENT_TYPE = {
  page: 'page_content',
  blog: 'blog_post_content',
};

/**
 * Filter options for the revision list.
 * 'all' shows every revision; 'named' shows only revisions with a custom name.
 */
const REVISION_FILTER_ALL = 'all';
const REVISION_FILTER_NAMED = 'named';

/**
 * Sidebar panel showing revision history for Pages and Blog Posts.
 * Fetches its own revision data via contentType + contentId — no revisions prop needed.
 * @param {object} props
 * @param {boolean} props.opened - Whether the sidebar is visible
 * @param {Function} props.onClose - Callback to close the sidebar
 * @param {'page'|'blog'|'template'} props.contentType - Type of content (template not yet implemented)
 * @param {number} props.contentId - ID of the page_content or blog_post_content row
 * @param {boolean} props.hasWritePermission - Whether the user can restore revisions
 * @param {Function} props.onContentRestored - Callback fired after a successful restore
 * @param {string} props.className - Additional CSS classes
 */
export default function RevisionsSidebar({
  opened,
  onClose,
  contentType,
  contentId,
  hasWritePermission = false,
  onContentRestored,
  className = '',
}) {
  const { t } = useTranslation();

  const [selectedRevisionId, setSelectedRevisionId] = useState(null);
  const [filter, setFilter] = useState(REVISION_FILTER_ALL);

  const modelName = MODEL_BY_CONTENT_TYPE[contentType];
  const { record, loading, getOne } = useModel(modelName, {
    id: contentId,
    autoFetch: opened && !!contentId,
  });

  /** @type {import('../../../typedefs/Revision').ContentRevision[]} */
  const revisions = record?.revisions ?? [];

  const filterOptions = [
    { value: REVISION_FILTER_ALL, label: t('All versions') },
    { value: REVISION_FILTER_NAMED, label: t('Named versions only') },
  ];

  const visibleRevisions =
    filter === REVISION_FILTER_NAMED ? revisions.filter((r) => r.name) : revisions;

  /**
   * Refreshes the revision list after a restore or rename without triggering
   * a full parent refetch.
   */
  const refreshRevisions = () => getOne(contentId);

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
        {loading ? (
          <div className="flex justify-center mt-8">
            <Loader size="sm" />
          </div>
        ) : visibleRevisions.length === 0 ? (
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
