import { ActionIcon, Menu, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconDotsVertical, IconHistoryToggle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import useFetch from '../../api/useFetch.js';
import NotificationState from '../../stores/NotificationState.js';

/** Maps contentType prop to the value expected by POST /revision/restore */
const RESTORE_CONTENT_TYPE_MAP = {
  page: 'page_content',
  blog: 'blog_post_content',
};

/**
 * Color palette for author indicator dots, cycled by owner_id.
 * Matches the multi-user color convention used in Google Docs.
 */
const AUTHOR_DOT_COLORS = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

/**
 * Returns a Tailwind bg color class for the author dot, derived from owner_id.
 * @param {number|null} ownerId
 */
function getAuthorDotColor(ownerId) {
  if (!ownerId) return 'bg-gray-400';
  return AUTHOR_DOT_COLORS[ownerId % AUTHOR_DOT_COLORS.length];
}

/**
 * Single revision row inside RevisionsModal.
 * Google Docs style: author dot · name · time · context menu on hover.
 * @param {object} props
 * @param {import('../../../typedefs/Revision').ContentRevision} props.revision
 * @param {boolean} props.isSelected
 * @param {Function} props.onClick
 * @param {boolean} props.hasWritePermission
 * @param {Function} props.onRestoreSuccess - called after a successful restore
 * @param {'page'|'blog'} props.contentType
 * @param {number} props.contentId
 */
export function RevisionItem({
  revision,
  isSelected,
  onClick,
  hasWritePermission,
  onRestoreSuccess,
  contentType,
  contentId,
}) {
  const { t } = useTranslation();
  const { notify } = NotificationState();
  const { post: restoreAPI } = useFetch('revision/restore', { autoFetch: false });

  const displayName = revision.name || `Version ${revision.revision_number}`;
  const timeLabel = dayjs.utc(revision.created_at).local().format('h:mm A');
  const dotColorClass = getAuthorDotColor(revision.owner_id);

  const confirmRestore = () => {
    modals.openConfirmModal({
      title: <div className="font-semibold">{t('Restore this version?')}</div>,
      children: (
        <Text size="sm">
          {t('The current draft will be replaced with the content from')}{' '}
          <strong>{displayName}</strong>.
        </Text>
      ),
      labels: { confirm: t('Restore'), cancel: t('Cancel') },
      confirmProps: { color: 'blue' },
      onConfirm: async () => {
        try {
          await restoreAPI({
            content_type: RESTORE_CONTENT_TYPE_MAP[contentType],
            content_id: contentId,
            revision_id: revision.id,
          });
          notify({ message: t('Content restored successfully.'), type: 'success' });
          onRestoreSuccess?.();
        } catch (error) {
          notify({ message: error.message, type: 'error' });
        }
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={clsx(
        'group relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none',
        isSelected
          ? 'bg-blue-50 border-l-2 border-blue-500 pl-2.5'
          : 'hover:bg-white border-l-2 border-transparent',
      )}
    >
      {/* Author color dot */}
      <div className={clsx('mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0', dotColorClass)} />

      {/* Revision name + time */}
      <Stack gap={1} className="flex-1 min-w-0">
        <Text size="sm" fw={isSelected ? 600 : 400} className="leading-snug" truncate>
          {displayName}
        </Text>
        <Text size="xs" c="dimmed">
          {timeLabel}
        </Text>
      </Stack>

      {/* Context menu — visible on group hover */}
      {hasWritePermission && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mt-0.5">
          <Menu shadow="sm" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                aria-label={t('Revision options')}
              >
                <IconDotsVertical size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconHistoryToggle size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  confirmRestore();
                }}
              >
                {t('Restore this version')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      )}
    </div>
  );
}
