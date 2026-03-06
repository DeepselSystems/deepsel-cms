import React, { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { getAttachmentRelativeUrl } from '@deepsel/cms-utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import { AttachmentFile, ChooseAttachmentModal } from '../../../../ChooseAttachmentModal';
import type { User } from '../../../../../stores';

interface EmbedAudioButtonProps {
  editor: Editor | null;
  children?: React.ReactNode;
  backendHost: string;
  user: User;
  setUser: (user: User | null) => void;
}

/**
 * Button to insert audio into the editor
 * @constructor
 */
const EmbedAudioButton = ({
  backendHost,
  user,
  setUser,
  editor,
  children,
}: EmbedAudioButtonProps) => {
  const { t } = useTranslation();

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
            {children || (
              <FontAwesomeIcon icon={faVolumeUp as IconProp} className="text-[#808496]" />
            )}
          </button>
        </Tooltip>

        <ChooseAttachmentModal
          backendHost={backendHost}
          user={user}
          setUser={setUser}
          filters={[
            {
              field: 'content_type',
              operator: 'like',
              value: 'audio%',
            },
          ]}
          filterFunc={(attachments: Array<AttachmentFile>) =>
            attachments.filter((attachment) =>
              attachment.content_type?.toLowerCase().startsWith('audio'),
            )
          }
          isOpen={isAttachmentModalOpened}
          close={() => setAttachmentModalOpened(false)}
          onChange={(attachment: AttachmentFile) => {
            const attachUrl = getAttachmentRelativeUrl(attachment.name);

            if (editor) {
              editor
                .chain()
                .focus()
                .setEmbedAudio({
                  src: attachUrl,
                })
                .run();

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
