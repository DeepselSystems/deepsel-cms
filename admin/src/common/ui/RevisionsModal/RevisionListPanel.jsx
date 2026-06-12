import { useState, useEffect, useCallback } from 'react';
import { Loader, ScrollArea, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconChevronDown } from '@tabler/icons-react';
import { RevisionItem } from './RevisionItem.jsx';
import { CurrentVersionItem } from './CurrentVersionItem.jsx';
import useModel from '../../api/useModel.jsx';
import useFetch from '../../api/useFetch.js';
import dayjs from 'dayjs';

/**
 * Filter options for the revision list.
 * 'all' shows every revision; 'named' shows only revisions with a custom name.
 */
const REVISION_FILTER_ALL = 'all';
const REVISION_FILTER_NAMED = 'named';

/** Sort newest revision first */
const REVISION_ORDER_BY = { field: 'created_at', direction: 'desc' };

/**
 * Groups an array of revisions (sorted newest-first) into date buckets.
 * Returns an ordered array of { label, items } — Today first, then Yesterday, then older dates.
 * @param {import('../../../typedefs/Revision').ContentRevision[]} revisions
 * @returns {{ label: string, items: import('../../../typedefs/Revision').ContentRevision[] }[]}
 */
function groupRevisionsByDate(revisions) {
  const today = dayjs().startOf('day');
  const yesterday = today.subtract(1, 'day');
  const groups = new Map();

  revisions.forEach((revision) => {
    const date = dayjs.utc(revision.created_at).local().startOf('day');
    let label;
    if (date.isSame(today)) {
      label = 'Today';
    } else if (date.isSame(yesterday)) {
      label = 'Yesterday';
    } else {
      label = date.format('MMM D, YYYY');
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(revision);
  });

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

/**
 * Resolves the backend model names and FK filter field for a given contentType.
 * @param {'page'|'blog'|'template'} contentType
 * @returns {{ revisionModel: string|null, contentModel: string|null, filterField: string|null }}
 */
function getRevisionConfig(contentType) {
  switch (contentType) {
    case 'page':
      return {
        revisionModel: 'page_content_revision',
        contentModel: 'page_content',
        filterField: 'page_content_id',
      };
    case 'blog':
      return {
        revisionModel: 'blog_post_content_revision',
        contentModel: 'blog_post_content',
        filterField: 'blog_post_content_id',
      };
    default:
      return { revisionModel: null, contentModel: null, filterField: null };
  }
}

/**
 * Right-hand panel of RevisionsModal showing revision history for Pages and Blog Posts.
 * Fetches revision records directly from the revision model filtered by contentId.
 * @param {object} props
 * @param {'page'|'blog'|'template'} props.contentType - Type of content (template not yet implemented)
 * @param {number} props.contentId - ID of the page_content or blog_post_content row
 * @param {boolean} props.hasWritePermission - Whether the user can restore revisions
 * @param {Function} props.onContentRestored - Callback fired after a successful restore
 * @param {boolean} props.opened - Whether the parent modal is open (triggers fetch)
 * @param {import('../../../typedefs/Revision').ContentRevision|null} props.selectedRevision - Currently selected revision (lifted state)
 * @param {Function} props.onRevisionSelect - Called when the user clicks a revision row
 */
export function RevisionListPanel({
  contentType,
  contentId,
  hasWritePermission = false,
  onContentRestored,
  opened,
  selectedRevision,
  onRevisionSelect,
}) {
  const { t } = useTranslation();

  /** null when nothing selected or when the current-version item is selected */
  const selectedRevisionId = selectedRevision?.isCurrent ? null : (selectedRevision?.id ?? null);
  const [filter, setFilter] = useState(REVISION_FILTER_ALL);

  const { revisionModel, contentModel, filterField } = getRevisionConfig(contentType);

  /** Always call useModel unconditionally; guard fetching via autoFetch:false + manual get() */
  const {
    data: revisions,
    loading,
    get,
  } = useModel(revisionModel ?? 'page_content_revision', {
    autoFetch: false,
    pageSize: null,
  });

  /**
   * Fetch the content record to derive the "Current version" item.
   * useFetch URL must be stable — use a fallback so hook is always called unconditionally.
   */
  const { record: contentRecord, get: fetchContentRecord } = useFetch(
    `${contentModel ?? 'page_content'}/${contentId ?? 0}`,
    { autoFetch: false },
  );

  /**
   * Normalized shape for the "Current version" row.
   *
   * Currently represents the last *published* version:
   *   content   → contentRecord.content
   *   timestamp → contentRecord.last_modified_at
   *   author    → contentRecord.updated_by
   *
   * To switch to unsaved draft, replace with:
   *   content   → contentRecord.draft_content
   *   timestamp → contentRecord.draft_last_modified_at
   *   author    → contentRecord.draft_updated_by
   */
  const currentVersionItem = contentRecord
    ? {
        isCurrent: true,
        id: null,
        new_content: contentRecord.content,
        created_at: contentRecord.last_modified_at ?? contentRecord.updated_at,
        owner: contentRecord.updated_by ?? null,
        name: null,
        revision_number: null,
        organization_id: contentRecord.organization_id,
        page_content: contentType === 'page'
          ? { id: contentRecord.id, organization_id: contentRecord.organization_id, locale: contentRecord.locale }
          : null,
        blog_post_content: contentType === 'blog'
          ? { id: contentRecord.id, organization_id: contentRecord.organization_id, locale: contentRecord.locale }
          : null,
      }
    : null;

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
   * Fetch revisions and the content record when the modal opens.
   */
  useEffect(() => {
    if (opened && contentId && revisionModel && contentModel) {
      fetchRevisions();
      fetchContentRecord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, contentId, fetchRevisions, revisionModel, contentModel]);

  /**
   * Auto-select the current version item once it loads, but only if nothing is selected yet.
   * Falls back to the newest revision if the content record is unavailable.
   */
  useEffect(() => {
    if (selectedRevision) return;
    if (currentVersionItem) {
      onRevisionSelect(currentVersionItem);
    } else if (revisions.length > 0) {
      onRevisionSelect(revisions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersionItem, revisions]);

  const filterOptions = [
    { value: REVISION_FILTER_ALL, label: t('All versions') },
    { value: REVISION_FILTER_NAMED, label: t('Named versions only') },
  ];

  /** @type {import('../../../typedefs/Revision').ContentRevision[]} */
  const visibleRevisions =
    filter === REVISION_FILTER_NAMED ? revisions.filter((r) => r.name) : revisions;

  const dateGroups = groupRevisionsByDate(visibleRevisions);

  /** Called by RevisionItem after a successful restore */
  const handleRestoreSuccess = useCallback(() => {
    fetchRevisions();
    onContentRestored?.();
  }, [fetchRevisions, onContentRestored]);

  /** Called by RevisionItem after a name is set, updated, or cleared */
  const handleNameChanged = useCallback(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200">
        <Text fw={700} size="lg" mb="sm">
          {t('Revision History')}
        </Text>
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
        ) : (
          <div className="py-2">
            {/* Current version is always shown at the top, regardless of filter */}
            {currentVersionItem && (
              <CurrentVersionItem
                currentVersionItem={currentVersionItem}
                isSelected={selectedRevision?.isCurrent === true}
                onClick={() => onRevisionSelect(currentVersionItem)}
              />
            )}

            {visibleRevisions.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" className="mt-4">
                {filter === REVISION_FILTER_NAMED
                  ? t('No named versions yet.')
                  : t('No revisions yet. Revisions are created each time you publish.')}
              </Text>
            ) : (
              dateGroups.map(({ label, items }) => (
                <div key={label} className="mb-3">
                  <Text size="xs" fw={600} c="dimmed" className="px-3 pb-1 uppercase tracking-wide">
                    {t(label)}
                  </Text>
                  {items.map((revision) => (
                    <RevisionItem
                      key={revision.id}
                      revision={revision}
                      isSelected={revision.id === selectedRevisionId}
                      onClick={() => onRevisionSelect(revision)}
                      hasWritePermission={hasWritePermission}
                      onRestoreSuccess={handleRestoreSuccess}
                      onNameChanged={handleNameChanged}
                      contentType={contentType}
                      contentId={contentId}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
