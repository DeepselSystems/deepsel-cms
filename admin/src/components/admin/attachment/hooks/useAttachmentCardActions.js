import { useTranslation } from 'react-i18next';
import { IconDownload, IconLink, IconPencil, IconTrash, IconTrashX } from '@tabler/icons-react';
import { getAttachmentUrl, downloadFromAttachUrl } from '../../../../common/utils/index.js';
import NotificationState from '../../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../../common/stores/BackendHostURLState.js';

/**
 * @typedef UseAttachmentCardActionsParams
 * @property {string|null} fileName - Filename of the currently selected locale version
 * @property {import('../../../../typedefs/AttachmentFile.js').AttachmentFile} attachment - The parent attachment record
 * @property {(attachment: import('../../../../typedefs/AttachmentFile.js').AttachmentFile) => void} onDelete - Delete callback from parent
 * @property {boolean} hasVersion - Whether the selected locale has an uploaded file; false = show edit-only actions
 * @property {() => void} [onEdit] - Opens the edit modal for this attachment
 */

/**
 * @typedef UseAttachmentCardActionsResult
 * @property {(e: React.MouseEvent) => Promise<void>} handleCopyLink
 * @property {(e: React.MouseEvent) => void} handleDownload
 * @property {(e: React.MouseEvent) => void} handleDelete
 * @property {(e: React.MouseEvent) => void} handleEdit
 * @property {(e: React.MouseEvent) => void} handleDeleteVersion
 * @property {import('../components/AttachmentCardOverlay.jsx').OverlayAction[]} overlayActions
 */

/**
 * Encapsulates all hover-overlay action logic for an attachment card.
 * Returns both individual handlers and the pre-built overlayActions array
 * ready to pass to AttachmentCardOverlay.
 *
 * @param {UseAttachmentCardActionsParams} params
 * @returns {UseAttachmentCardActionsResult}
 */
export function useAttachmentCardActions({ fileName, attachment, onDelete, hasVersion, onEdit }) {
  const { t } = useTranslation();
  const { backendHost } = BackendHostURLState((state) => state);
  const { notify } = NotificationState((state) => state);

  /** Copies the serve URL of the active locale version to the clipboard. */
  const handleCopyLink = async (event) => {
    event.stopPropagation();
    if (!fileName) return;
    const attachUrl = getAttachmentUrl(backendHost, fileName);
    try {
      await navigator.clipboard.writeText(attachUrl);
      notify({ title: t('Success'), message: t('Link copied to clipboard'), type: 'success' });
    } catch (error) {
      console.error('Failed to copy link:', error);
      notify({ title: t('Error'), message: t('Failed to copy link'), type: 'error' });
    }
  };

  /** Initiates file download for the active locale version. */
  const handleDownload = (event) => {
    event.stopPropagation();
    if (!fileName) return;
    downloadFromAttachUrl(getAttachmentUrl(backendHost, fileName));
  };

  /** Delegates deletion of the whole attachment to the parent. */
  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete(attachment);
  };

  /** Opens the edit modal for this attachment. */
  const handleEdit = (event) => {
    event.stopPropagation();
    onEdit?.();
  };

  /** Deletes only the currently selected locale version. Placeholder until version delete is implemented. */
  const handleDeleteVersion = (event) => {
    event.stopPropagation();
    console.log('Delete version', attachment);
  };

  /** Full action set when a file exists for the selected locale. */
  const fullActions = [
    { key: 'copy-link', icon: IconLink, label: t('Copy Link'), onClick: handleCopyLink },
    { key: 'download', icon: IconDownload, label: t('Download'), onClick: handleDownload },
    { key: 'edit', icon: IconPencil, label: t('Edit'), onClick: handleEdit },
    { key: 'delete-version', icon: IconTrashX, label: t('Delete this version'), onClick: handleDeleteVersion, color: 'orange' },
    { key: 'delete', icon: IconTrash, label: t('Delete'), onClick: handleDelete, color: 'red' },
  ];

  /** Reduced action set when the selected locale has no file yet. */
  const noFileActions = [
    { key: 'edit', icon: IconPencil, label: t('Edit'), onClick: handleEdit },
  ];

  /**
   * Actions exposed to the overlay — filtered based on whether a version exists.
   * @type {import('../components/AttachmentCardOverlay.jsx').OverlayAction[]}
   */
  const overlayActions = hasVersion ? fullActions : noFileActions;

  return { handleCopyLink, handleDownload, handleDelete, handleEdit, handleDeleteVersion, overlayActions };
}
