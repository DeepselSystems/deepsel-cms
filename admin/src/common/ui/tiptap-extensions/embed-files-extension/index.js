import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView.jsx';
import { EMBED_FILES_ATTRIBUTES, EMBED_FILES_CLASSES, MAX_FILES_COUNT } from './utils.js';
import { getAttachmentRelativeUrl } from '../../../utils/index.js';

/**
 * Embed Files extension for TipTap
 * Allows embedding multiple files with download links
 */
export const EmbedFiles = Node.create({
  name: 'embedFiles',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: EMBED_FILES_CLASSES.WRAPPER,
      },
    };
  },

  addAttributes() {
    return {
      files: {
        default: [],
        parseHTML: (element) => {
          const filesAttr = element.getAttribute(EMBED_FILES_ATTRIBUTES.FILES);
          if (filesAttr) {
            try {
              return JSON.parse(filesAttr);
            } catch (e) {
              return [];
            }
          }
          return [];
        },
        renderHTML: (attributes) => {
          if (!attributes.files || attributes.files.length === 0) {
            return {};
          }
          return {
            [EMBED_FILES_ATTRIBUTES.FILES]: JSON.stringify(attributes.files),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${EMBED_FILES_ATTRIBUTES.CONTAINER}]`,
      },
      {
        tag: `div.${EMBED_FILES_CLASSES.WRAPPER}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { files } = node.attrs;

    if (!files || files.length === 0) {
      return ['div', {}];
    }

    // Create file items
    const fileItems = files.map((file) => {
      const relativeUrl = getAttachmentRelativeUrl(file.name);
      return [
        'div',
        {
          class: EMBED_FILES_CLASSES.FILE_ITEM,
        },
        [
          'a',
          {
            href: relativeUrl,
            download: file.name,
            class: EMBED_FILES_CLASSES.FILE_CONTENT,
            title: file.name,
          },
          [
            'span',
            {
              class: EMBED_FILES_CLASSES.FILE_ICON,
            },
            '📄',
          ],
          [
            'span',
            {
              class: EMBED_FILES_CLASSES.FILE_LINK,
            },
            file.name,
          ],
        ],
      ];
    });

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        [EMBED_FILES_ATTRIBUTES.CONTAINER]: 'true',
        [EMBED_FILES_ATTRIBUTES.FILES]: JSON.stringify(files),
      }),
      [
        'div',
        {
          class: EMBED_FILES_CLASSES.FILES_CONTAINER,
        },
        ...fileItems,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEmbedFiles:
        (options) =>
        ({ commands }) => {
          if (!options.files || options.files.length === 0) {
            return false;
          }

          // Limit to MAX_FILES_COUNT
          const limitedFiles = options.files.slice(0, MAX_FILES_COUNT);

          return commands.insertContent({
            type: this.name,
            attrs: {
              files: limitedFiles,
            },
          });
        },
      updateEmbedFiles:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EmbedFiles;
