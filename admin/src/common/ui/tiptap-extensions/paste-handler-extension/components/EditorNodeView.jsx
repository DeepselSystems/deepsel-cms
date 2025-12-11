import {useState} from 'react';
import {NodeViewWrapper} from '@tiptap/react';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import useEffectOnce from '../../../../hooks/useEffectOnce.js';
import useUpload from '../../../../api/useUpload.js';
import {Skeleton} from '@mantine/core';
import NotificationState from '../../../../stores/NotificationState.js';
import {formatFileSize} from '../../../../utils/index.js';
import {insertAttachmentsToEditor} from '../utils.js';

/**
 * EditorNodeView component for paste handler
 * Displays pasted files with basic information
 * @param {Object} node - TipTap node object
 * @param {Object} editor - TipTap editor instance
 * @param {Function} getPos - Function to get current node position
 */
const EditorNodeView = ({node, editor, getPos}) => {
  // Translation
  const {t} = useTranslation();

  // Notification
  const {notify} = NotificationState();

  /** @type {Array<File>} */
  const files = node.attrs.files || [];

  // Uploading state
  const [hasUploaded, setHasUploaded] = useState(false);

  // Attachment query
  const {uploadFileModel} = useUpload();

  /**
   * Load basic file information
   */
  useEffectOnce(() => {
    notify({
      message: t('Uploading...'),
      type: 'info',
      duration: 100000,
    });
    uploadFileModel('attachment', files)
      .then((attachments) => {
        // Replace the paste handler node with attachments
        if (attachments && attachments.length > 0 && editor && getPos) {
          // Delete current paste handler node
          const pos = getPos();
          editor
            .chain()
            .focus()
            .deleteRange({from: pos, to: pos + node.nodeSize})
            .run();

          // Insert attachment files to editor at the position
          insertAttachmentsToEditor(attachments, editor).then();

          // Notify
          notify({
            message: t('Uploaded successfully'),
            type: 'success',
            duration: 3000,
          });
        }
      })
      .catch((error) => {
        console.error('Upload failed:', error);
        notify({
          message: t(error.message || 'Upload failed'),
          type: 'error',
          duration: 3000,
        });
      })
      .finally(() => {
        setHasUploaded(true);
      });
  });

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <>
      <NodeViewWrapper className={clsx('paste-handler-wrapper')}>
        <div className="space-y-2">
          {!hasUploaded &&
            files.map((file, index) => (
              <div
                key={index}
                className={clsx(
                  'inline-flex gap-3 items-center border border-opacity-50 rounded px-2 py-1'
                )}
              >
                <div className="p-1 flex items-center">
                  <Skeleton width={50} height={60} />
                </div>
                <div>
                  <div className="max-w-36 truncate font-bold">{file.name}</div>
                  <div className="text-sm text-gray">
                    {formatFileSize(file.size)}
                  </div>
                  <div className="text-sm">{t('Uploading...')}</div>
                </div>
              </div>
            ))}
        </div>
      </NodeViewWrapper>
    </>
  );
};

export default EditorNodeView;
