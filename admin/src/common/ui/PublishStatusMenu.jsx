import { useState } from 'react';
import { Menu, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import {
  IconArrowBackUp,
  IconChevronDown,
  IconExternalLink,
  IconWorldOff,
  IconWorldUpload,
} from '@tabler/icons-react';
import NotificationState from '../stores/NotificationState.js';
import useFetch from '../api/useFetch.js';

export default function PublishStatusMenu({
  recordType,
  record,
  isCreateMode,
  activeContent,
  siteSettings,
  typeLabel,
  publicUrlPrefix = '',
  parentFields,
  flushDraft,
  onAfterPublish,
  onAfterUnpublish,
  onAfterRevert,
}) {
  const { t } = useTranslation();
  const { notify } = NotificationState();
  const [isPublishing, setIsPublishing] = useState(false);

  const { post: publishAPI } = useFetch('draft/publish', { autoFetch: false });
  const { post: unpublishAPI } = useFetch('draft/unpublish', { autoFetch: false });
  const { post: revertAPI } = useFetch('draft/revert', { autoFetch: false });

  const activeHasDraft = !!activeContent?.has_draft;
  // Per-language publish state. `last_modified_at` is set in /draft/publish, so it
  // doubles as "this language has been published at least once". The whole-record
  // `record.published` flag still gates public visibility (and the Unpublish action).
  const langPublished = !isCreateMode && !!activeContent?.last_modified_at;
  const languageName = activeContent?.locale?.name || activeContent?.locale?.iso_code || '';
  const statusLabel = isCreateMode
    ? t('New draft')
    : langPublished
      ? activeHasDraft
        ? t('Published · Draft pending')
        : t('Published')
      : t('Draft');

  const baseClass = `text-xs px-2 py-1 rounded ${
    langPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
  }`;

  if (isCreateMode) {
    return <span className={baseClass}>{statusLabel}</span>;
  }

  const runPublish = async () => {
    try {
      setIsPublishing(true);
      await flushDraft?.();
      await publishAPI({
        record_type: recordType,
        record_id: record.id,
        parent_fields: parentFields,
        content_id: activeContent?.id,
      });
      notify({ message: t('{{type}} published.', { type: typeLabel }), type: 'success' });
      await onAfterPublish?.();
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const confirmAndPublish = () => {
    modals.openConfirmModal({
      title: (
        <div className="font-semibold">
          {t('Publish {{type}}?', { type: typeLabel.toLowerCase() })}
        </div>
      ),
      children: (
        <Text size="sm">
          {t('Your')} <strong>{languageName}</strong>{' '}
          {t('changes will become visible to the public immediately.')}
        </Text>
      ),
      labels: { confirm: t('Publish'), cancel: t('Cancel') },
      confirmProps: { color: 'green' },
      onConfirm: runPublish,
    });
  };

  const runRevert = async () => {
    try {
      await revertAPI({
        record_type: recordType,
        record_id: record.id,
        content_id: activeContent?.id,
      });
      notify({ message: t('Changes reverted.'), type: 'info' });
      await onAfterRevert?.();
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    }
  };

  const confirmAndRevert = () => {
    modals.openConfirmModal({
      title: <div className="font-semibold">{t('Revert changes?')}</div>,
      children: (
        <Text size="sm">
          {t('This will discard the current draft for')} <strong>{languageName}</strong>{' '}
          {t('and restore the published version.')}
        </Text>
      ),
      labels: { confirm: t('Revert'), cancel: t('Cancel') },
      confirmProps: { color: 'red' },
      onConfirm: runRevert,
    });
  };

  const runUnpublish = async () => {
    try {
      await unpublishAPI({ record_type: recordType, record_id: record.id });
      notify({ message: t('{{type}} unpublished.', { type: typeLabel }), type: 'info' });
      await onAfterUnpublish?.();
    } catch (error) {
      console.error(error);
      notify({ message: error.message, type: 'error' });
    }
  };

  const lang = activeContent?.locale?.iso_code || siteSettings?.default_language?.iso_code || '';
  // Page slugs live per-language on the content row; blog post slugs live on the parent record.
  const rawSlug = activeContent?.slug || record?.slug || '';
  const slugPath = rawSlug ? (rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`) : '';
  const publicHref = `/${lang}${publicUrlPrefix}${slugPath}`;

  return (
    <Menu shadow="md" position="bottom-end">
      <Menu.Target>
        <button
          type="button"
          disabled={isPublishing}
          className={`${baseClass} cursor-pointer inline-flex items-center gap-1 ${
            record?.published ? 'hover:bg-green-200' : 'hover:bg-gray-200'
          }`}
        >
          {statusLabel}
          <IconChevronDown size={12} />
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        {(!langPublished || activeHasDraft) && (
          <Menu.Item
            leftSection={<IconWorldUpload size={16} />}
            onClick={confirmAndPublish}
            disabled={isPublishing}
          >
            {t('Publish changes')}
          </Menu.Item>
        )}
        {langPublished && activeHasDraft && (
          <Menu.Item leftSection={<IconArrowBackUp size={16} />} onClick={confirmAndRevert}>
            {t('Revert changes')}
          </Menu.Item>
        )}
        {record?.published && (
          <Menu.Item color="red" leftSection={<IconWorldOff size={16} />} onClick={runUnpublish}>
            {t('Unpublish')}
          </Menu.Item>
        )}
        {record?.published && langPublished && (
          <Menu.Item
            leftSection={<IconExternalLink size={16} />}
            component="a"
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Show public version')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
