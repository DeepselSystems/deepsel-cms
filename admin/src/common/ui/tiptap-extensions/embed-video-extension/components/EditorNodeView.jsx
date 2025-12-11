import {useCallback} from 'react';
import {NodeViewWrapper} from '@tiptap/react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {modals} from '@mantine/modals';
import {useTranslation} from 'react-i18next';
import {EMBED_VIDEO_ATTRIBUTES, EMBED_VIDEO_CLASSES} from '../utils.js';
import clsx from 'clsx';

/**
 * EditorNodeView component for embed video
 * Displays video player with delete button on hover
 */
const EditorNodeView = ({node, deleteNode}) => {
  const {t} = useTranslation();
  const {src, width, height} = node.attrs;

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
            <div className="text-lg font-semibold">{t('Delete Video')}</div>
          ),
          children: t('Are you sure you want to delete this video?'),
          labels: {confirm: t('Delete'), cancel: t('Cancel')},
          onConfirm: deleteNode,
        });
      }
    },
    [deleteNode, t]
  );

  return (
    <NodeViewWrapper
      className={clsx(EMBED_VIDEO_CLASSES.WRAPPER, 'relative group my-4')}
      {...{
        [EMBED_VIDEO_ATTRIBUTES.CONTAINER]: 'true',
        [EMBED_VIDEO_ATTRIBUTES.SRC]: src,
        [EMBED_VIDEO_ATTRIBUTES.WIDTH]: width?.toString(),
        [EMBED_VIDEO_ATTRIBUTES.HEIGHT]: height?.toString(),
      }}
    >
      {/* Hover Overlay */}
      <div
        className={clsx(
          'absolute w-full h-full top-0 left-0',
          'bg-gray-emperor rounded transition opacity-0 group-hover:opacity-50'
        )}
      />

      {/* Delete Button */}
      <div
        className={clsx(
          'transition opacity-0 group-hover:opacity-100',
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50'
        )}
      >
        <button
          onClick={handleDeleteClick}
          className={clsx(
            'p-3 rounded bg-red-500 text-white bg-opacity-90',
            'flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110'
          )}
          title={t('Delete Video')}
        >
          <FontAwesomeIcon icon={faTrash} className="w-6 h-6" />
        </button>
      </div>

      {/* Video Container */}
      <div className={EMBED_VIDEO_CLASSES.VIDEO_CONTAINER}>
        <video
          src={src}
          width={width}
          height={height}
          controls
          className={EMBED_VIDEO_CLASSES.VIDEO_CONTENT}
        >
          {t('Your browser does not support the video tag.')}
        </video>
      </div>
    </NodeViewWrapper>
  );
};

export default EditorNodeView;
