import { ActionIcon, Menu, Stack, Text, TextInput, Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconDotsVertical,
  IconHistoryToggle,
  IconTag,
  IconPencil,
  IconTagOff,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import useFetch from '../../api/useFetch.js';
import NotificationState from '../../stores/NotificationState.js';

/**
 * Controlled name input rendered inside a Mantine modal.
 * Uses a mutable ref to pass the current value back to the caller on confirm.
 */
function NameModalContent({ initialName, nameRef, onConfirm, onCancel }) {
  const { t } = useTranslation();

  return (
    <div>
      <TextInput
        defaultValue={initialName}
        onChange={(e) => {
          nameRef.current = e.currentTarget.value;
        }}
        placeholder={t('e.g. Before redesign')}
        autoFocus
        mb="md"
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" color="gray" size="sm" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button size="sm" onClick={onConfirm}>
          {t('Save')}
        </Button>
      </Group>
    </div>
  );
}

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
 * @param {Function} props.onNameChanged - called after a successful name set/update/delete
 * @param {'page'|'blog'} props.contentType
 * @param {number} props.contentId
 */
export function RevisionItem({
  revision,
  isSelected,
  onClick,
  hasWritePermission,
  onRestoreSuccess,
  onNameChanged,
  contentType,
  contentId,
}) {
  const { t } = useTranslation();
  const { notify } = NotificationState();
  const { post: restoreAPI } = useFetch('revision/restore', { autoFetch: false });
  const { post: nameAPI } = useFetch('revision/name', { autoFetch: false });

  /** Full timestamp shown as primary label for unnamed revisions (matches Google Docs style) */
  const timeLabel = dayjs.utc(revision.created_at).local().format('h:mm A, MMM D');
  const dotColorClass = getAuthorDotColor(revision.owner_id);
  const authorLabel = revision.owner
    ? `${revision.owner.first_name ?? ''} ${revision.owner.last_name ?? ''}`.trim() ||
      revision.owner.username
    : null;

  const confirmRestore = () => {
    modals.openConfirmModal({
      title: <div className="font-semibold">{t('Restore this version?')}</div>,
      children: (
        <Text size="sm">
          {t('The current draft will be replaced with the content from')}{' '}
          <strong>{revision.name ?? timeLabel}</strong>.
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

  const openNameModal = (initialName = '') => {
    const nameRef = { current: initialName };
    const isRename = Boolean(initialName);

    modals.open({
      title: (
        <div className="font-semibold">
          {isRename ? t('Rename version') : t('Name this version')}
        </div>
      ),
      children: (
        <NameModalContent
          initialName={initialName}
          nameRef={nameRef}
          onCancel={() => modals.closeAll()}
          onConfirm={async () => {
            const trimmed = nameRef.current.trim();
            if (!trimmed) return;
            try {
              await nameAPI({
                content_type: RESTORE_CONTENT_TYPE_MAP[contentType],
                revision_id: revision.id,
                name: trimmed,
              });
              notify({ message: t('Version name saved.'), type: 'success' });
              modals.closeAll();
              onNameChanged?.();
            } catch (error) {
              notify({ message: error.message, type: 'error' });
            }
          }}
        />
      ),
    });
  };

  const confirmDeleteName = () => {
    modals.openConfirmModal({
      title: <div className="font-semibold">{t('Delete version name?')}</div>,
      children: (
        <Text size="sm">
          {t('This will remove the name from')} <strong>{revision.name}</strong>.
        </Text>
      ),
      labels: { confirm: t('Delete'), cancel: t('Cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await nameAPI({
            content_type: RESTORE_CONTENT_TYPE_MAP[contentType],
            revision_id: revision.id,
            name: null,
          });
          notify({ message: t('Version name removed.'), type: 'success' });
          onNameChanged?.();
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
      {/* Named: [name] / [timestamp] / [dot+author]. Unnamed: [timestamp] / [dot+author] */}
      <Stack gap={2} className="flex-1 min-w-0">
        <Text size="sm" fw={600} className="leading-snug" truncate>
          {revision.name ?? timeLabel}
        </Text>
        {revision.name && (
          <Text size="xs" c="dimmed" truncate>
            {timeLabel}
          </Text>
        )}
        {authorLabel && (
          <Group gap={6} wrap="nowrap">
            <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', dotColorClass)} />
            <Text size="xs" c="dimmed" truncate>
              {authorLabel}
            </Text>
          </Group>
        )}
      </Stack>

      {/* Context menu — visible on group hover */}
      {hasWritePermission && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
              {!revision.name && (
                <Menu.Item
                  leftSection={<IconTag size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openNameModal('');
                  }}
                >
                  {t('Name this version')}
                </Menu.Item>
              )}
              {revision.name && (
                <Menu.Item
                  leftSection={<IconPencil size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openNameModal(revision.name);
                  }}
                >
                  {t('Rename')}
                </Menu.Item>
              )}
              {revision.name && (
                <Menu.Item
                  leftSection={<IconTagOff size={14} />}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteName();
                  }}
                >
                  {t('Delete name')}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </div>
      )}
    </div>
  );
}
