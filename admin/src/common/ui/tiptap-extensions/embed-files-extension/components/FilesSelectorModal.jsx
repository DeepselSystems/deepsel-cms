import { Modal, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import ChooseAttachmentModal from '../../../ChooseAttachmentModal.jsx';
import { useState } from 'react';
import { MAX_FILES_COUNT, getShortUrl } from '../utils.js';
import { getAttachmentRelativeUrl } from '../../../../utils/index.js';
import NotificationState from '../../../../stores/NotificationState.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import clsx from 'clsx';

/**
 * Files selector modal
 *
 * @param {import('@tiptap/core/src/Editor').Editor} editor
 * @param {boolean} opened
 * @param {React.Dispatch<React.SetStateAction<boolean>>} setOpened
 * @param {Array<EmbedFileItem>} selectedFiles
 * @param {React.Dispatch<React.SetStateAction<Array<EmbedFileItem>>>} setSelectedFiles
 * @param {boolean} isEditMode - If true, modal is in edit mode
 * @param {Function} onUpdate - Callback for edit mode to update files
 *
 * @returns {JSX.Element}
 * @constructor
 */
const FilesSelectorModal = ({
  editor,
  opened,
  setOpened,
  selectedFiles,
  setSelectedFiles,
  isEditMode = false,
  onUpdate,
}) => {
  // Translation
  const { t } = useTranslation();

  // Notification
  const { notify } = NotificationState((state) => state);

  // Modal visibility state
  const [isAttachmentModalOpened, setIsAttachmentModalOpened] = useState(false);

  /**
   * Filter attachments to exclude video, audio, and image files
   */
  const filterFunc = (attachments) =>
    attachments.filter((attachment) => {
      const contentType = attachment.content_type.toLowerCase();
      return (
        !contentType.startsWith('video') &&
        !contentType.startsWith('audio') &&
        !contentType.startsWith('audio') &&
        !contentType.startsWith('image')
      );
    });

  /**
   * Insert or update files
   */
  const insertFiles = () => {
    if (selectedFiles.length === 0) {
      return;
    }

    // Edit mode - use onUpdate callback
    if (isEditMode && onUpdate) {
      onUpdate(selectedFiles);
      return;
    }

    // Insert mode - use editor commands
    if (editor) {
      editor
        .chain()
        .focus()
        .setEmbedFiles({
          files: selectedFiles,
        })
        .run();

      // Add line break after a while
      setTimeout(() => {
        editor.chain().focus().createParagraphNear().run();
      }, 300);

      // Reset and close
      setSelectedFiles([]);
      setOpened(false);
    }
  };

  /**
   * Handle remove file
   */
  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  /**
   * Handle file selection from ChooseAttachmentModal
   */
  const handleFileSelect = (attachment) => {
    // Check if already selected
    if (selectedFiles.some((f) => f.url === attachment.name)) {
      notify({
        type: 'warning',
        message: t('This file is already selected'),
      });
      return;
    }

    // Check max files limit
    if (selectedFiles.length >= MAX_FILES_COUNT) {
      notify({
        type: 'warning',
        message: t(`You can only select up to ${MAX_FILES_COUNT} files`),
      });
      return;
    }

    // Get relative attachment URL
    const attachUrl = getAttachmentRelativeUrl(attachment.name);

    // Add to selected files
    const newFiles = [
      ...selectedFiles,
      {
        url: attachUrl,
        name: attachment.name.split('/').pop(),
      },
    ];

    setSelectedFiles(newFiles);

    // Close ChooseAttachmentModal after selection
    setIsAttachmentModalOpened(false);
  };

  return (
    <>
      <Modal
        opened={opened}
        title={
          <div className="text-lg font-semibold">
            {isEditMode ? t('Edit files') : t('Select files')}
          </div>
        }
        onClose={() => setOpened(false)}
        size="xl"
      >
        <div className="space-y-4">
          {/* Selected files list */}
          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                {t('Selected files')} ({selectedFiles.length}/{MAX_FILES_COUNT})
              </div>
              {selectedFiles.map((file, index) => {
                const shortUrl = getShortUrl(file.url);
                return (
                  <div
                    key={index}
                    className={clsx(
                      'flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200',
                    )}
                  >
                    <FontAwesomeIcon icon={faFile} className="text-blue-500 text-lg" />
                    <div className="flex-1 truncate" title={file.name || shortUrl}>
                      {file.name || shortUrl}
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-2 text-primary-main hover:bg-red-50 rounded transition"
                      title={t('Remove')}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('No files selected. Click "Add file" to select files.')}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-between pt-4 border-t">
            <Button
              variant="outline"
              leftSection={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => setIsAttachmentModalOpened(true)}
              disabled={selectedFiles.length >= MAX_FILES_COUNT}
            >
              {t('Add file')}
            </Button>

            <div className="flex gap-2">
              <Button variant="subtle" onClick={() => setOpened(false)}>
                {t('Cancel')}
              </Button>
              <Button onClick={insertFiles} disabled={selectedFiles.length === 0}>
                {isEditMode ? t('Update') : t('Insert')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ChooseAttachmentModal
        filters={[]}
        isOpen={isAttachmentModalOpened}
        close={() => setIsAttachmentModalOpened(false)}
        onChange={handleFileSelect}
        filterFunc={filterFunc}
      />
    </>
  );
};

export default FilesSelectorModal;
