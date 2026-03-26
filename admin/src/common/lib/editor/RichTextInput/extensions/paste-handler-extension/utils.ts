import type { Editor } from "@tiptap/core";
import { getAttachmentRelativeUrl } from "@deepsel/cms-utils";

/**
 * Constants for paste handler attributes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const PASTE_HANDLER_ATTRIBUTES = {
  CONTAINER: "data-paste-handler",
} as const;

interface AttachmentFile {
  name: string;
  content_type: string;
}

/**
 * Insert uploaded attachments into the editor
 * Handles different content types (image, video, audio)
 * @param {Array<AttachmentFile>} attachments - Array of uploaded attachment files
 * @param {Object} editor - TipTap editor instance
 */
export const insertAttachmentsToEditor = async (
  attachments: AttachmentFile[],
  editor: Editor,
): Promise<void> => {
  if (!attachments || attachments.length === 0 || !editor) {
    return;
  }

  const unknownAttachments: AttachmentFile[] = [];

  for (const attachment of attachments) {
    const fileType = attachment.content_type.match(/^([^/]+)/)?.[0];
    let needAddLineBreak = true;

    switch (fileType) {
      case "image": {
        if (editor.can().setEnhancedImage({ src: "", description: "" })) {
          const imageUrl = getAttachmentRelativeUrl(attachment.name);
          editor
            .chain()
            .focus()
            .setEnhancedImage({
              src: imageUrl,
              description: "",
            })
            .run();
        } else {
          console.warn(
            "EnhancedImage extension is not enabled. Cannot insert image",
          );
        }
        break;
      }

      case "video": {
        if (editor.can().setEmbedVideo({ src: "" })) {
          const videoUrl = getAttachmentRelativeUrl(attachment.name);
          editor
            .chain()
            .focus()
            .setEmbedVideo({
              src: videoUrl,
            })
            .run();
        } else {
          console.warn(
            "EmbedVideo extension is not enabled. Cannot insert video",
          );
        }
        break;
      }

      case "audio": {
        if (editor.can().setEmbedAudio({ src: "" })) {
          const audioUrl = getAttachmentRelativeUrl(attachment.name);
          editor
            .chain()
            .focus()
            .setEmbedAudio({
              src: audioUrl,
            })
            .run();
        } else {
          console.warn(
            "EmbedAudio extension is not enabled. Cannot insert audio",
          );
        }
        break;
      }

      default: {
        unknownAttachments.push(attachment);
        needAddLineBreak = false;
        break;
      }
    }

    if (needAddLineBreak) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      editor
        .chain()
        .focus()
        .createParagraphNear()
        .insertContent([{ type: "paragraph" }, { type: "paragraph" }])
        .run();
    }
  }

  if (unknownAttachments.length) {
    if (editor.can().setEmbedFiles({ files: [] })) {
      editor
        .chain()
        .focus()
        .setEmbedFiles({
          files: unknownAttachments.map((attachment) => {
            const attachUrl = getAttachmentRelativeUrl(attachment.name);
            return {
              url: attachUrl,
              name: attachment.name.split("/").pop() || attachment.name,
            };
          }),
        })
        .run();
    } else {
      console.warn(
        "EmbedFiles extension is not enabled. Cannot insert unknown file",
      );
    }
  }
};
