import { useState } from 'react';
import ChooseAttachmentModal from '../../../ChooseAttachmentModal.jsx';
import { getAttachmentRelativeUrl } from '../../../../utils/index.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { faVolumeUp } from '@fortawesome/free-solid-svg-icons';

/**
 * Button to insert audio into the editor
 *
 * @param {import('@tiptap/core/src/Editor').Editor} editor
 * @param {Element} children
 *
 * @returns {JSX.Element}
 * @constructor
 */
const EmbedAudioButton = ({ editor, children }) => {
  // Translation
  const { t } = useTranslation();

  // Model visibility state
  const [isAttachmentModalOpened, setAttachmentModalOpened] = useState(false);

  return (
    <>
      <Box>
        <Tooltip label={t('Insert audio')}>
          <button
            type="button"
            onClick={() => setAttachmentModalOpened(true)}
            className="w-6 h-6 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
          >
            {children || <FontAwesomeIcon icon={faVolumeUp} className="text-[#808496]" />}
          </button>
        </Tooltip>

        <ChooseAttachmentModal
          filters={[
            {
              field: 'content_type',
              operator: 'like',
              value: 'audio%',
            },
          ]}
          filterFunc={(attachments) =>
            attachments.filter((attachment) =>
              attachment.content_type.toLowerCase().startsWith('audio'),
            )
          }
          isOpen={isAttachmentModalOpened}
          close={() => setAttachmentModalOpened(false)}
          onChange={(attachment) => {
            // Get relative attachment URL
            const attachUrl = getAttachmentRelativeUrl(attachment.name);

            // Always insert the embed audio into the editor
            if (editor) {
              editor
                .chain()
                .focus()
                .setEmbedAudio({
                  src: attachUrl,
                })
                .run();

              // Add line break after a while
              setTimeout(() => {
                editor.chain().focus().createParagraphNear().run();
              }, 300);
            }
          }}
        />
      </Box>
    </>
  );
};

export default EmbedAudioButton;
