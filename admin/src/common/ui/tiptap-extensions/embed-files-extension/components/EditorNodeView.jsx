import {useCallback, useState} from 'react';
import {NodeViewWrapper} from '@tiptap/react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTrash, faPen} from '@fortawesome/free-solid-svg-icons';
import {modals} from '@mantine/modals';
import {useTranslation} from 'react-i18next';
import {EMBED_FILES_ATTRIBUTES, EMBED_FILES_CLASSES} from '../utils.js';
import clsx from 'clsx';
import FilesSelectorModal from './FilesSelectorModal.jsx';
import {getAttachmentRelativeUrl} from '../../../../utils/index.js';

/**
 * EditorNodeView component for embed files
 * Displays list of files with download links and delete button on hover
 */
const EditorNodeView = ({node, deleteNode, updateAttributes}) => {
  const {t} = useTranslation();
  const {files} = node.attrs;

  // Edit modal state
  const [isEditModalOpened, setIsEditModalOpened] = useState(false);
  const [editingFiles, setEditingFiles] = useState([]);

  /**
   * Handle edit button click - opens edit modal
   */
  const handleEditClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingFiles([...files]);
      setIsEditModalOpened(true);
    },
    [files]
  );

  /**
   * Handle delete button click - removes the node
   */
  const handleDeleteClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (deleteNode) {
        modals.openConfirmModal({
          centered: true,
          title: (
            <div className="text-lg font-semibold">{t('Delete Files')}</div>
          ),
          children: t('Are you sure you want to delete these files?'),
          labels: {confirm: t('Delete'), cancel: t('Cancel')},
          onConfirm: deleteNode,
        });
      }
    },
    [deleteNode, t]
  );

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <NodeViewWrapper
      className={clsx(EMBED_FILES_CLASSES.WRAPPER, 'relative group my-4')}
      {...{
        [EMBED_FILES_ATTRIBUTES.CONTAINER]: 'true',
        [EMBED_FILES_ATTRIBUTES.FILES]: JSON.stringify(files),
      }}
    >
      {/* Hover Overlay */}
      <div
        className={clsx(
          'absolute w-full h-full top-0 left-0',
          'bg-gray-emperor rounded transition opacity-0 group-hover:opacity-50'
        )}
      />

      {/* Action Buttons */}
      <div
        className={clsx(
          'transition opacity-0 group-hover:opacity-100',
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'flex gap-2'
        )}
      >
        <button
          onClick={handleEditClick}
          className={clsx(
            'group-hover:opacity-100 p-3 rounded bg-gray-ebony text-white bg-opacity-90 flex items-center justify-center',
            'shadow-lg transition-all duration-200 transform hover:scale-110'
          )}
          title={t('Edit Files')}
        >
          <FontAwesomeIcon icon={faPen} className="w-6 h-6" />
        </button>
        <button
          onClick={handleDeleteClick}
          className={clsx(
            'p-3 rounded bg-red-500 text-white bg-opacity-90',
            'flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110'
          )}
          title={t('Delete Files')}
        >
          <FontAwesomeIcon icon={faTrash} className="w-6 h-6" />
        </button>
      </div>

      {/* Files Container */}
      <div className={EMBED_FILES_CLASSES.FILES_CONTAINER}>
        {files.map((file, index) => {
          const relativeUrl = getAttachmentRelativeUrl(file.name);
          return (
            <div key={index} className={clsx(EMBED_FILES_CLASSES.FILE_ITEM)}>
              <a
                href={relativeUrl}
                download
                className={EMBED_FILES_CLASSES.FILE_CONTENT}
                title={file.name}
              >
                <span className={EMBED_FILES_CLASSES.FILE_ICON}>📄</span>
                <span className={EMBED_FILES_CLASSES.FILE_LINK}>
                  {file.name}
                </span>
              </a>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <FilesSelectorModal
        editor={null}
        opened={isEditModalOpened}
        setOpened={setIsEditModalOpened}
        selectedFiles={editingFiles}
        setSelectedFiles={setEditingFiles}
        isEditMode={true}
        onUpdate={(updatedFiles) => {
          if (updateAttributes) {
            updateAttributes({files: updatedFiles});
          }
          setIsEditModalOpened(false);
        }}
      />
    </NodeViewWrapper>
  );
};

export default EditorNodeView;
