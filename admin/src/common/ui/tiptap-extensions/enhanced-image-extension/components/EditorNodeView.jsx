import { useState, useRef, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faPlus,
  faMinus,
  faTrash,
  faEdit,
  faCircle,
  faIndent,
} from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import DescriptionModal from './DescriptionModal.jsx';
import {
  ENHANCED_IMAGE_ATTRIBUTES,
  ENHANCED_IMAGE_ALIGNMENTS,
  ENHANCED_IMAGE_CLASSES,
  IMAGE_WIDTH_DEFAULT,
} from '../utils.js';
import clsx from 'clsx';

/**
 * EditorNodeView component for enhanced image with description
 * Provides hover menu with image controls and description editing
 */
const EditorNodeView = ({ node, updateAttributes, deleteNode }) => {
  // Translation
  const { t } = useTranslation();

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { src, alt, title, width, height, alignment, rounded, circle, inline, description } =
    node.attrs;

  /**
   * Handle alignment change
   * @param newAlignment
   */
  const handleAlignmentChange = (newAlignment) => {
    updateAttributes({ alignment: newAlignment });
  };

  /**
   * Handle size change
   * @param increase
   */
  const handleSizeChange = (increase = true) => {
    const currentWidth = width || IMAGE_WIDTH_DEFAULT;
    const newWidth = increase
      ? Math.round(currentWidth * 1.1)
      : Math.max(50, Math.round(currentWidth * 0.9));
    updateAttributes({ width: newWidth });
  };

  /**
   * Handle click rounded toggle
   */
  const handleRoundedToggle = () => {
    updateAttributes({ rounded: !rounded });
  };

  /**
   * Handle click circle toggle
   */
  const handleCircleToggle = () => {
    updateAttributes({ circle: !circle });
  };

  /**
   * Handle click inline toggle
   */
  const handleInlineToggle = () => {
    updateAttributes({ inline: !inline });
  };

  /**
   * Handle saved description
   */
  const handleDescriptionUpdate = (newDescription) => {
    updateAttributes({ description: newDescription });
    setIsModalOpen(false);
  };

  // Alignment styles based on inline mode
  const alignmentStyles = useMemo(() => {
    if (inline) {
      // Inline mode: float image to allow text wrapping
      switch (alignment) {
        case ENHANCED_IMAGE_ALIGNMENTS.LEFT:
          return {
            display: 'inline-block',
            float: 'left',
            margin: '0 1rem 1rem 0',
            width: 'fit-content',
          };
        case ENHANCED_IMAGE_ALIGNMENTS.RIGHT:
          return {
            display: 'inline-block',
            float: 'right',
            margin: '0 0 1rem 1rem',
            width: 'fit-content',
          };
        case ENHANCED_IMAGE_ALIGNMENTS.CENTER:
        default:
          return {
            display: 'inline-block',
            float: 'left',
            margin: '0 1rem 1rem 0',
            width: 'fit-content',
          };
      }
    } else {
      // Block mode: standard alignment
      switch (alignment) {
        case ENHANCED_IMAGE_ALIGNMENTS.LEFT:
          return {
            display: 'block',
            textAlign: 'left',
            marginLeft: '0',
            marginRight: 'auto',
            width: 'fit-content',
          };
        case ENHANCED_IMAGE_ALIGNMENTS.RIGHT:
          return {
            display: 'block',
            textAlign: 'right',
            marginLeft: 'auto',
            marginRight: '0',
            width: 'fit-content',
          };
        case ENHANCED_IMAGE_ALIGNMENTS.CENTER:
        default:
          return {
            display: 'block',
            textAlign: 'center',
            margin: '0 auto',
            width: 'fit-content',
          };
      }
    }
  }, [alignment, inline]);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={clsx(
        ENHANCED_IMAGE_CLASSES.WRAPPER,
        'relative inline-block max-w-fit',
        'transition group hover:bg-gray-500 -m-2 p-2 hover:bg-opacity-10',
      )}
      style={alignmentStyles}
      {...{
        [ENHANCED_IMAGE_ATTRIBUTES.CONTAINER]: 'true',
        [ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT]: alignment,
        [ENHANCED_IMAGE_ATTRIBUTES.ROUNDED]: rounded?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.CIRCLE]: circle?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.INLINE]: inline?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.DESCRIPTION]: description || '',
      }}
    >
      {/* Image */}
      <img
        src={src}
        alt={alt || ''}
        title={title || ''}
        width={width}
        height={height}
        style={{
          borderRadius: circle ? '50%' : rounded ? '6px' : '0',
          aspectRatio: circle ? '1' : 'auto',
          objectFit: circle ? 'cover' : 'initial',
          maxWidth: '100%',
          height: 'auto',
        }}
        draggable={false}
      />

      {/* Description */}
      {description && description.trim() && (
        <div className={clsx(ENHANCED_IMAGE_CLASSES.DESCRIPTION)}>{description}</div>
      )}

      {/* Hover Menu */}
      <div
        className={clsx(
          'transition opacity-0 group-hover:opacity-100',
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'bg-white border border-gray-200 rounded shadow-lg p-1 flex gap-0.5',
        )}
      >
        {/* Align Left */}
        <Tooltip label={t('Align Left')}>
          <button
            type="button"
            onClick={() => handleAlignmentChange(ENHANCED_IMAGE_ALIGNMENTS.LEFT)}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-gray-200': alignment === ENHANCED_IMAGE_ALIGNMENTS.LEFT,
              },
            )}
          >
            <FontAwesomeIcon icon={faAlignLeft} className="text-gray-600 text-xs" />
          </button>
        </Tooltip>

        {/* Align Center - only for block mode */}
        {!inline && (
          <Tooltip label={t('Align Center')}>
            <button
              type="button"
              onClick={() => handleAlignmentChange(ENHANCED_IMAGE_ALIGNMENTS.CENTER)}
              className={clsx(
                'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
                {
                  'bg-gray-200': alignment === ENHANCED_IMAGE_ALIGNMENTS.CENTER,
                },
              )}
            >
              <FontAwesomeIcon icon={faAlignCenter} className="text-gray-600 text-xs" />
            </button>
          </Tooltip>
        )}

        {/* Align Right */}
        <Tooltip label={t('Align Right')}>
          <button
            type="button"
            onClick={() => handleAlignmentChange(ENHANCED_IMAGE_ALIGNMENTS.RIGHT)}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-gray-200': alignment === ENHANCED_IMAGE_ALIGNMENTS.RIGHT,
              },
            )}
          >
            <FontAwesomeIcon icon={faAlignRight} className="text-gray-600 text-xs" />
          </button>
        </Tooltip>

        {/* Increase Size */}
        <Tooltip label={t('Increase Size')}>
          <button
            type="button"
            onClick={() => handleSizeChange(true)}
            className="w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faPlus} className="text-gray-600 text-xs" />
          </button>
        </Tooltip>

        {/* Decrease Size */}
        <Tooltip label={t('Decrease Size')}>
          <button
            type="button"
            onClick={() => handleSizeChange(false)}
            className="w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faMinus} className="text-gray-600 text-xs" />
          </button>
        </Tooltip>

        {/* Toggle Rounded */}
        <Tooltip label={t('Toggle Rounded Corners')}>
          <button
            type="button"
            onClick={handleRoundedToggle}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-gray-200': rounded,
              },
            )}
          >
            <div
              className={clsx('w-3 h-3 border-2 border-gray-600', {
                rounded: rounded,
              })}
            />
          </button>
        </Tooltip>

        {/* Toggle Circle */}
        <Tooltip label={t('Toggle Circle Shape')}>
          <button
            type="button"
            onClick={handleCircleToggle}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-gray-200': circle,
              },
            )}
          >
            <FontAwesomeIcon
              icon={faCircle}
              className={clsx('text-xs', {
                'text-gray-600': !circle,
                'text-blue-600': circle,
              })}
            />
          </button>
        </Tooltip>

        {/* Toggle Inline/Attachment Mode */}
        <Tooltip label={t('Toggle Inline Mode (Text Wrapping)')}>
          <button
            type="button"
            onClick={handleInlineToggle}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-blue-200': inline,
              },
            )}
          >
            <FontAwesomeIcon
              icon={faIndent}
              className={clsx('text-xs', {
                'text-gray-600': !inline,
                'text-blue-600': inline,
              })}
            />
          </button>
        </Tooltip>

        {/* Edit Description */}
        <Tooltip label={t('Edit Description')}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={clsx(
              'w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-gray-100',
              {
                'bg-blue-100': description && description.trim(),
              },
            )}
          >
            <FontAwesomeIcon icon={faEdit} className="text-gray-600 text-xs" />
          </button>
        </Tooltip>

        {/* Delete Image */}
        <Tooltip label={t('Delete Image')}>
          <button
            type="button"
            onClick={deleteNode}
            className="w-6 h-6 flex justify-center items-center rounded p-1 cursor-pointer hover:bg-red-100"
          >
            <FontAwesomeIcon icon={faTrash} className="text-red-500 text-xs" />
          </button>
        </Tooltip>
      </div>

      {/* Description Modal */}
      <DescriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleDescriptionUpdate}
        initialDescription={description || ''}
      />
    </NodeViewWrapper>
  );
};

export default EditorNodeView;
