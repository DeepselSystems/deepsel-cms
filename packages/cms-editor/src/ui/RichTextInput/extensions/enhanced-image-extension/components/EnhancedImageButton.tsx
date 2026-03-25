import React, { useState } from "react";
import type { Editor } from "@tiptap/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { getAttachmentRelativeUrl } from "@deepsel/cms-utils";
import { EnhancedImageSelectorModal } from "@deepsel/cms-react";
import type { User } from "@deepsel/cms-react";

interface EnhancedImageButtonProps {
  editor: Editor | null;
  onAddImageOverride?: (url: string) => void;
  children?: React.ReactNode;
  backendHost: string;
  user: User | null;
  setUser: (user: User | null) => void;
}

interface Attachment {
  name: string;
}

/**
 * Button to insert image into the editor
 *
 * @constructor
 */
const EnhancedImageButton = ({
  editor,
  onAddImageOverride = () => {},
  backendHost,
  user,
  setUser,
  children,
}: EnhancedImageButtonProps) => {
  const { t } = useTranslation();

  const [enhanceImageSelectorModalOpened, setEnhanceImageSelectorModalOpened] =
    useState(false);

  return (
    <>
      <Tooltip label={t("Insert Image")}>
        <button
          type="button"
          onClick={() => setEnhanceImageSelectorModalOpened(true)}
        >
          {children || (
            <FontAwesomeIcon
              icon={faImage as IconProp}
              className="text-[#808496]"
            />
          )}
        </button>
      </Tooltip>

      <EnhancedImageSelectorModal
        backendHost={backendHost}
        user={user}
        setUser={setUser}
        opened={enhanceImageSelectorModalOpened}
        setOpened={setEnhanceImageSelectorModalOpened}
        onSelect={(attachment: Attachment) => {
          const attachUrl = getAttachmentRelativeUrl(attachment.name);

          onAddImageOverride(attachUrl);

          if (editor) {
            editor
              .chain()
              .focus()
              .setEnhancedImage({
                src: attachUrl,
              })
              .run();

            setTimeout(() => {
              editor.chain().focus().createParagraphNear().run();
            }, 300);
          }

          setEnhanceImageSelectorModalOpened(false);
        }}
      />
    </>
  );
};

export default EnhancedImageButton;
