import React, { useState } from 'react';
import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { IconVideo } from '@tabler/icons-react';
import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ChooseAttachmentModal } from '../../../../../ui/ChooseAttachmentModal';
import { getAttachmentRelativeUrl } from '@deepsel/cms-utils';
import type { User } from '../../../../../types';

interface EmbedVideoButtonProps {
  editor: Editor | null;
  backendHost: string;
  user: User;
  setUser: (user: User | null) => void;
  children?: ReactNode;
}

/**
 * Button to insert video into the editor
 *
 * @constructor
 */
const EmbedVideoButton = ({
  backendHost,
  user,
  setUser,
  editor,
  children,
}: EmbedVideoButtonProps) => {
  const { t } = useTranslation();

  const [isAttachmentModalOpened, setAttachmentModalOpened] = useState(false);

  return (
    <>
      <Box>
        <Tooltip label={t('Insert video')}>
          <button
            type="button"
            onClick={() => setAttachmentModalOpened(true)}
            className="w-8 h-8 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
          >
            {children || <IconVideo size={22} className="text-[#808496]" />}
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
              value: 'video%',
            },
          ]}
          filterFunc={(attachments) =>
            attachments.filter((attachment) =>
              attachment.content_type?.toLowerCase().startsWith('video'),
            )
          }
          isOpen={isAttachmentModalOpened}
          close={() => setAttachmentModalOpened(false)}
          onChange={(attachment) => {
            const attachUrl = getAttachmentRelativeUrl(attachment.name);

            if (editor) {
              editor
                .chain()
                .focus()
                .setEmbedVideo({
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

export default EmbedVideoButton;
