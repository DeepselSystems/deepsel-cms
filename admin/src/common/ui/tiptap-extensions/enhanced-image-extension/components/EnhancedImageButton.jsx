import {useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faImage} from '@fortawesome/free-solid-svg-icons';
import {Tooltip} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {getAttachmentRelativeUrl} from '../../../../utils/index.js';
import {EnhancedImageSelectorModal} from '../../../EnhancedImageSelector/index.jsx';

/**
 * Button to insert image into the editor
 *
 * @param {import('@tiptap/core/src/Editor').Editor} editor
 * @param {() => void} onAddImageOverride
 * @param {Element} children
 *
 * @returns {JSX.Element}
 * @constructor
 */
const EnhancedImageButton = ({
  editor,
  onAddImageOverride = () => {},
  children,
}) => {
  // Translation
  const {t} = useTranslation();

  // Visibility state
  const [enhanceImageSelectorModalOpened, setEnhanceImageSelectorModalOpened] =
    useState(false);

  return (
    <>
      <Tooltip label={t('Insert Image')}>
        <button
          type="button"
          onClick={() => setEnhanceImageSelectorModalOpened(true)}
        >
          {children || (
            <FontAwesomeIcon icon={faImage} className="text-[#808496]" />
          )}
        </button>
      </Tooltip>

      <EnhancedImageSelectorModal
        opened={enhanceImageSelectorModalOpened}
        setOpened={setEnhanceImageSelectorModalOpened}
        onSelect={(attachment) => {
          // Get relative attachment URL
          const attachUrl = getAttachmentRelativeUrl(attachment.name);

          // Call the override function but also insert the image by default
          onAddImageOverride(attachUrl);

          // Always insert the enhanced image into the editor
          if (editor) {
            editor
              .chain()
              .focus()
              .setEnhancedImage({
                src: attachUrl,
              })
              .run();

            // Add line break after a while
            setTimeout(() => {
              editor.chain().focus().createParagraphNear().run();
            }, 300);
          }

          // Close modal
          setEnhanceImageSelectorModalOpened(false);
        }}
      />
    </>
  );
};

export default EnhancedImageButton;
