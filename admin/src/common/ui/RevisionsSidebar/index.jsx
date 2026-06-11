import { useState, useEffect, useCallback } from 'react';
import { ActionIcon, Group, Loader, ScrollArea, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import useModel from '../../api/useModel.jsx';

/**
 * Filter options for the revision list.
 * 'all' shows every revision; 'named' shows only revisions with a custom name.
 */
const REVISION_FILTER_ALL = 'all';
const REVISION_FILTER_NAMED = 'named';

/** Sort newest revision first */
const REVISION_ORDER_BY = { field: 'created_at', direction: 'desc' };

/**
 * Resolves the backend revision model name and FK filter field for a given contentType.
 * @param {'page'|'blog'|'template'} contentType
 * @returns {{ revisionModel: string|null, filterField: string|null }}
 */
function getRevisionConfig(contentType) {
  switch (contentType) {
    case 'page':
      return { revisionModel: 'page_content_revision', filterField: 'page_content_id' };
    case 'blog':
      return { revisionModel: 'blog_post_content_revision', filterField: 'blog_post_content_id' };
    default:
      return { revisionModel: null, filterField: null };
  }
}

/**
 * Sidebar panel showing revision history for Pages and Blog Posts.
 * Fetches revision records directly from the revision model filtered by contentId.
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

  /** @type {[import('../../../typedefs/Revision').ContentRevision|null, Function]} */
  const [selectedRevision, setSelectedRevision] = useState(null);
  const selectedRevisionId = selectedRevision?.id ?? null;
  const [filter, setFilter] = useState(REVISION_FILTER_ALL);

  const { revisionModel, filterField } = getRevisionConfig(contentType);

  /** Always call useModel unconditionally; guard fetching via autoFetch:false + manual get() */
  const {
    data: revisions,
    loading,
    get,
  } = useModel(revisionModel ?? 'page_content_revision', {
    autoFetch: false,
    pageSize: null,
  });

  const fetchRevisions = useCallback(() => {
    if (!contentId || !revisionModel || !filterField) return;
    get({
      order_by: REVISION_ORDER_BY,
      search: {
        AND: [{ field: filterField, operator: '=', value: contentId }],
        OR: [],
      },
    });
    // `get` is not useCallback-wrapped in useModel so its reference changes every render.
    // We always pass a full queryObject so the stale closure is safe to ignore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, revisionModel, filterField]);

  /**
   * Fetch revisions when the sidebar is opened and the contentId is available.
   */
  useEffect(() => {
    if (opened && contentId && revisionModel) {
      fetchRevisions();
    }
  }, [opened, contentId, fetchRevisions, revisionModel]);

  const filterOptions = [
    { value: REVISION_FILTER_ALL, label: t('All versions') },
    { value: REVISION_FILTER_NAMED, label: t('Named versions only') },
  ];

  /** @type {import('../../../typedefs/Revision').ContentRevision[]} */
  const visibleRevisions =
    filter === REVISION_FILTER_NAMED ? revisions.filter((r) => r.name) : revisions;

  // If the sidebar is not opened, return null
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
