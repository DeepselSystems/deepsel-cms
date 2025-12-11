import {getAttachmentRelativeUrl} from '../../../utils/index.js';

/**
 * Constants for paste handler attributes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const PASTE_HANDLER_ATTRIBUTES = {
  CONTAINER: 'data-paste-handler',
};

/**
 * Insert uploaded attachments into the editor
 * Handles different content types (image, video, audio)
 * @param {Array<AttachmentFile>} attachments - Array of uploaded attachment files
 * @param {Object} editor - TipTap editor instance
 */
export const insertAttachmentsToEditor = async (attachments, editor) => {
  // Check if attachments or editor is invalid
  if (!attachments || attachments.length === 0 || !editor) {
    return;
  }

  // Array to store unknown attachments
  const unknownAttachments = [];

  // Insert attachments to editor with specific file type
  for (const attachment of attachments) {
    // Get file type
    const fileType = attachment.content_type.match(/^([^/]+)/)?.[0];
    let needAddLineBreak = true;

    switch (fileType) {
      case 'image':
        {
          // Insert attachment as EnhancedImage
          if (editor.chain().setEnhancedImage) {
            const imageUrl = getAttachmentRelativeUrl(attachment.name);
            editor
              .chain()
              .focus()
              .setEnhancedImage({
                src: imageUrl,
                description: '',
              })
              .run();
          } else {
            console.warn(
              'EnhancedImage extension is not enabled. Cannot insert image'
            );
          }
        }
        break;

      case 'video':
        {
          // Insert attachment as EmbedVideo
          if (editor.chain().setEmbedVideo) {
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
              'EmbedVideo extension is not enabled. Cannot insert video'
            );
          }
        }
        break;

      case 'audio':
        {
          // Insert attachment as EmbedAudio
          if (editor.chain().setEmbedAudio) {
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
              'EmbedAudio extension is not enabled. Cannot insert audio'
            );
          }
        }
        break;

      default:
        {
          // For unknown file types, push to unknown attachments and show all of them one time later
          unknownAttachments.push(attachment);
          needAddLineBreak = false;
        }
        break;
    }

    // Wait 300ms after inserting if needed
    if (needAddLineBreak) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      editor
        .chain()
        .focus()
        .createParagraphNear()
        .insertContent([{type: 'paragraph'}, {type: 'paragraph'}])
        .run();
    }
  }

  // Insert attachments as UnknownFile
  if (unknownAttachments.length) {
    if (editor.chain().setEmbedFiles) {
      editor
        .chain()
        .focus()
        .setEmbedFiles({
          files: unknownAttachments.map((attachment) => {
            const attachUrl = getAttachmentRelativeUrl(attachment.name);
            return {
              url: attachUrl,
              name: attachment.name.split('/').pop(),
            };
          }),
        })
        .run();
    } else {
      console.warn(
        'EmbedFiles extension is not enabled. Cannot insert unknown file'
      );
    }
  }
};
