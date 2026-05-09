import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@mantine/core';
import { IconDownload, IconLink, IconTrash } from '@tabler/icons-react';
import clsx from 'clsx';
import { getAttachmentUrl, downloadFromAttachUrl } from '../../../../common/utils/index.js';
import Button from '../../../../common/ui/Button.jsx';
import NotificationState from '../../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../../common/stores/BackendHostURLState.js';
import { useDefaultLocale } from '../../../../common/hooks/useDefaultLocale.js';
import { useSelectedVersion } from '../hooks/useSelectedVersion.js';
import { formatFileSize, getFileExtension } from '@deepsel/cms-utils/common/utils';
import {
  FILE_TYPE_ICONS_BASE_PATH,
  SUPPORTED_FILE_TYPE_ICON_EXTENSIONS,
} from '../../../../constants/attachment.js';
import { VersionFlagBar } from './VersionFlagBar.jsx';

/**
 * Returns the icon image path for a given filename.
 * Falls back to generic.png for unsupported extensions.
 * @param {string} filename
 * @returns {string}
 */
function getFileTypeIcon(filename) {
  const extension = getFileExtension(filename);
  return SUPPORTED_FILE_TYPE_ICON_EXTENSIONS.includes(extension)
    ? `${FILE_TYPE_ICONS_BASE_PATH}/${extension}.png`
    : `${FILE_TYPE_ICONS_BASE_PATH}/generic.png`;
}

/**
 * @typedef AttachmentCardProps
 * @property {import('../../../../typedefs/AttachmentFile.js').AttachmentFile} attachment
 * @property {(attachment: import('../../../../typedefs/AttachmentFile.js').AttachmentFile) => void} onDelete
 * @property {boolean} selected - Whether this card is currently selected in bulk-select mode
 * @property {(attachment: import('../../../../typedefs/AttachmentFile.js').AttachmentFile) => void} onToggleSelect
 * @property {boolean} selectionMode - Whether bulk-select mode is active (shows checkbox)
 */

/**
 * Displays a single attachment card with locale-version switching via flag chips,
 * preview (image or file-type icon), file meta, and hover actions (Copy Link, Download, Delete).
 *
 * Version selection: defaults to the site's default language version, or the first
 * available version when the default is not present. Clicking a flag in VersionFlagBar
 * switches the preview and meta to that locale version.
 *
 * @param {AttachmentCardProps} props
 */
export function AttachmentCard({ attachment, onDelete, selected, onToggleSelect, selectionMode }) {
  const { t } = useTranslation();
  const { backendHost } = BackendHostURLState((state) => state);
  const { notify } = NotificationState((state) => state);
  const [showOverlay, setShowOverlay] = useState(false);

  const { defaultLocaleId, availableLanguages } = useDefaultLocale();
  const { selectedVersion, setSelectedVersion, availableVersions } = useSelectedVersion(
    attachment,
    defaultLocaleId,
  );

  // Derive display values from the currently selected locale version
  const fileName = selectedVersion?.name ?? null;
  const isImage = selectedVersion?.content_type?.startsWith('image') ?? false;
  const fileSize = formatFileSize(selectedVersion?.filesize ?? 0);

  /** Triggers bulk-select toggle when selection mode is active. @param {React.MouseEvent} _ */
  const handleCardClick = (_) => {
    if (selectionMode) onToggleSelect(attachment);
  };

  /** Toggles selection without propagating the click to the card. @param {React.MouseEvent} e */
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggleSelect(attachment);
  };

  /** Initiates file download for the active locale version. @param {React.MouseEvent} event */
  const handleDownload = (event) => {
    event.stopPropagation();
    if (!fileName) return;
    downloadFromAttachUrl(getAttachmentUrl(backendHost, fileName));
  };

  /** Copies the serve URL of the active locale version to the clipboard. @param {React.MouseEvent} e */
  const handleCopyLink = async (e) => {
    e.stopPropagation();
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

  /** Delegates deletion of the whole attachment to the parent. @param {React.MouseEvent} e */
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(attachment);
  };

  // Attachment has no locale versions yet (legacy or upload in progress)
  if (!selectedVersion) {
    return (
      <div className="relative shadow border border-gray-200 rounded-lg overflow-hidden opacity-50">
        <div className="flex items-center justify-center h-36 bg-gray-50 text-gray-400 text-xs">
          {t('No file')}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative shadow border rounded-lg overflow-hidden cursor-pointer',
        selected ? 'border-primary-main ring-2 ring-primary-main' : 'border-gray-300',
      )}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onClick={handleCardClick}
    >
      {/* Bulk-select checkbox — visible on hover or when selection mode is active */}
      <div
        className={clsx(
          'absolute top-2 left-2 z-10 bg-white rounded p-0.5 shadow transition-opacity',
          selected || showOverlay || selectionMode ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleCheckboxClick}
      >
        <Checkbox checked={selected} onChange={() => {}} size="sm" />
      </div>

      {/* Preview area — switches content based on selected locale version */}
      {isImage ? (
        <div className="relative">
          <img
            src={getAttachmentUrl(backendHost, fileName)}
            className="h-36 w-full object-cover"
            alt={selectedVersion.alt_text ?? fileName}
          />
          {showOverlay && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Button onClick={handleCopyLink} size="xs" variant="filled" className="px-2 py-1">
                <IconLink size={18} className="mr-1" />
                {t('Copy Link')}
              </Button>
              <Button onClick={handleDownload} size="xs" variant="filled" className="px-2 py-1">
                <IconDownload size={18} className="mr-1" />
                {t('Download')}
              </Button>
              <Button
                onClick={handleDelete}
                size="xs"
                variant="filled"
                color="red"
                className="px-2 py-1"
              >
                <IconTrash size={18} className="mr-1" />
                {t('Delete')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative bg-gray-100">
          <div className="flex flex-col items-center justify-center h-36 p-2" title={fileName}>
            <img
              src={getFileTypeIcon(fileName)}
              alt={getFileExtension(fileName)}
              className="w-20 h-20 object-contain"
            />
          </div>
          {showOverlay && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
              <Button onClick={handleCopyLink} size="xs" variant="filled" className="px-2 py-1">
                <IconLink size={18} className="mr-1" />
                {t('Copy Link')}
              </Button>
              <Button onClick={handleDownload} size="xs" variant="filled" className="px-2 py-1">
                <IconDownload size={18} className="mr-1" />
                {t('Download')}
              </Button>
              <Button
                onClick={handleDelete}
                size="xs"
                variant="filled"
                color="red"
                className="px-2 py-1"
              >
                <IconTrash size={18} className="mr-1" />
                {t('Delete')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Locale flag bar — click a flag to switch preview to that language version */}
      <VersionFlagBar
        versions={availableVersions}
        selectedVersionId={selectedVersion.id}
        onSelectVersion={setSelectedVersion}
        defaultLocaleId={defaultLocaleId}
        availableLanguages={availableLanguages}
      />

      {/* File name and size for the selected locale version */}
      <div className="p-2 text-sm">
        <div className="font-medium truncate" title={fileName}>
          {fileName}
        </div>
        <div className="text-gray-500">{fileSize}</div>
      </div>
    </div>
  );
}
