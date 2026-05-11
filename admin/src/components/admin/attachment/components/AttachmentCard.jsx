import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileOff } from '@tabler/icons-react';
import clsx from 'clsx';
import { useDefaultLocale } from '../../../../common/hooks/useDefaultLocale.js';
import { useSelectedVersion } from '../hooks/useSelectedVersion.js';
import { useAttachmentCardActions } from '../hooks/useAttachmentCardActions.js';
import { getAttachmentUrl } from '../../../../common/utils/index.js';
import BackendHostURLState from '../../../../common/stores/BackendHostURLState.js';
import { formatFileSize, getFileExtension } from '@deepsel/cms-utils/common/utils';
import {
  FILE_TYPE_ICONS_BASE_PATH,
  SUPPORTED_FILE_TYPE_ICON_EXTENSIONS,
} from '../../../../constants/attachment.js';
import { VersionFlagBar } from './VersionFlagBar.jsx';
import { AttachmentCardOverlay } from './AttachmentCardOverlay.jsx';
import { EditAttachmentModal } from './EditAttachmentModal.jsx';

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
 * @property {(updated: import('../../../../typedefs/AttachmentFile.js').AttachmentFile) => void} [onAttachmentUpdated] - Called when the attachment is updated via the edit modal
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
export function AttachmentCard({ attachment, onDelete, selected, onToggleSelect, selectionMode, onAttachmentUpdated }) {
  const { t } = useTranslation();
  const { backendHost } = BackendHostURLState((state) => state);
  const [showOverlay, setShowOverlay] = useState(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { defaultLocaleId, availableLanguages } = useDefaultLocale();
  const { selectedVersion, selectedLocaleId, setSelectedLocale, availableVersions } =
    useSelectedVersion(attachment, defaultLocaleId);
  const hasVersion = selectedVersion != null;

  // Derive display values from the currently selected locale version
  const fileName = selectedVersion?.name ?? null;
  const isImage = selectedVersion?.content_type?.startsWith('image') ?? false;
  const fileSize = formatFileSize(selectedVersion?.filesize ?? 0);

  // Locale name for the no-file placeholder (from availableLanguages or version locale)
  const selectedLangName =
    availableLanguages?.find((l) => l.id === selectedLocaleId)?.name ??
    selectedVersion?.locale?.name ??
    null;

  const { overlayActions } = useAttachmentCardActions({
    fileName,
    attachment,
    onDelete,
    hasVersion,
    onEdit: openEdit,
  });

  /** Triggers bulk-select toggle when selection mode is active. @param {React.MouseEvent} _ */
  const handleCardClick = (_) => {
    if (selectionMode) onToggleSelect(attachment);
  };

  /** Toggles selection without propagating the click to the card. @param {React.MouseEvent} e */
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggleSelect(attachment);
  };

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

      {/* Preview area — switches content based on selected locale and whether a file exists */}
      {!hasVersion ? (
        <div className="relative bg-gray-50">
          <div className="flex flex-col items-center justify-center h-36 gap-1.5 text-gray-400">
            <IconFileOff size={32} />
            <span className="text-xs text-center px-2">
              {selectedLangName
                ? t('No file for {{lang}}', { lang: selectedLangName })
                : t('No file for this language')}
            </span>
          </div>
          {showOverlay && <AttachmentCardOverlay actions={overlayActions} />}
        </div>
      ) : isImage ? (
        <div className="relative">
          <img
            src={getAttachmentUrl(backendHost, fileName)}
            className="h-36 w-full object-cover"
            alt={selectedVersion.alt_text ?? fileName}
          />
          {showOverlay && <AttachmentCardOverlay actions={overlayActions} blurred />}
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
          {showOverlay && <AttachmentCardOverlay actions={overlayActions} />}
        </div>
      )}

      {/* Locale flag bar — click any flag (including no-file ones) to switch locale */}
      <VersionFlagBar
        versions={availableVersions}
        selectedLocaleId={selectedLocaleId}
        onSelectLocale={setSelectedLocale}
        defaultLocaleId={defaultLocaleId}
        availableLanguages={availableLanguages}
      />

      {/* File name and size — only shown when a file exists for the selected locale */}
      {hasVersion && (
        <div className="p-2 text-sm">
          <div className="font-medium truncate" title={fileName}>
            {fileName}
          </div>
          <div className="text-gray-500">{fileSize}</div>
        </div>
      )}

      {/* Edit modal — mounted per card so each card manages its own state */}
      <EditAttachmentModal
        attachment={attachment}
        opened={editOpened}
        onClose={closeEdit}
        onSaved={onAttachmentUpdated}
        availableLanguages={availableLanguages}
      />
    </div>
  );
}
