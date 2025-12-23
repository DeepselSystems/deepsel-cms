import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView.jsx';
import {
  EMBED_VIDEO_ATTRIBUTES,
  EMBED_VIDEO_CLASSES,
  VIDEO_WIDTH_DEFAULT,
  VIDEO_HEIGHT_DEFAULT,
} from './utils.js';

/**
 * Embed Video extension for TipTap
 * Allows embedding video files with basic player controls
 */
export const EmbedVideo = Node.create({
  name: 'embedVideo',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: EMBED_VIDEO_CLASSES.WRAPPER,
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          return (
            element.getAttribute(EMBED_VIDEO_ATTRIBUTES.SRC) ||
            element.querySelector('video')?.getAttribute('src') ||
            null
          );
        },
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            [EMBED_VIDEO_ATTRIBUTES.SRC]: attributes.src,
          };
        },
      },
      width: {
        default: VIDEO_WIDTH_DEFAULT,
        parseHTML: (element) => {
          const width =
            element.getAttribute(EMBED_VIDEO_ATTRIBUTES.WIDTH) ||
            element.querySelector('video')?.getAttribute('width');
          return width ? width : VIDEO_WIDTH_DEFAULT;
        },
        renderHTML: (attributes) => {
          return {
            [EMBED_VIDEO_ATTRIBUTES.WIDTH]:
              attributes.width?.toString() || VIDEO_WIDTH_DEFAULT.toString(),
          };
        },
      },
      height: {
        default: VIDEO_HEIGHT_DEFAULT,
        parseHTML: (element) => {
          const height =
            element.getAttribute(EMBED_VIDEO_ATTRIBUTES.HEIGHT) ||
            element.querySelector('video')?.getAttribute('height');
          return height ? height : VIDEO_HEIGHT_DEFAULT;
        },
        renderHTML: (attributes) => {
          return {
            [EMBED_VIDEO_ATTRIBUTES.HEIGHT]:
              attributes.height?.toString() || VIDEO_HEIGHT_DEFAULT.toString(),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${EMBED_VIDEO_ATTRIBUTES.CONTAINER}]`,
      },
      {
        tag: `div.${EMBED_VIDEO_CLASSES.WRAPPER}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, width, height } = node.attrs;

    // Create video element
    const videoElement = [
      'div',
      {
        class: EMBED_VIDEO_CLASSES.VIDEO_CONTAINER,
      },
      [
        'video',
        {
          src: src,
          width: width,
          height: height,
          controls: true,
          class: EMBED_VIDEO_CLASSES.VIDEO_CONTENT,
        },
      ],
    ];

    // Build elements array
    const elements = [videoElement];

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        [EMBED_VIDEO_ATTRIBUTES.CONTAINER]: 'true',
        [EMBED_VIDEO_ATTRIBUTES.SRC]: src,
        [EMBED_VIDEO_ATTRIBUTES.WIDTH]: width?.toString() || VIDEO_WIDTH_DEFAULT.toString(),
        [EMBED_VIDEO_ATTRIBUTES.HEIGHT]: height?.toString() || VIDEO_HEIGHT_DEFAULT.toString(),
      }),
      ...elements,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEmbedVideo:
        (options) =>
        ({ commands }) => {
          if (!options.src) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              width: options.width || VIDEO_WIDTH_DEFAULT,
              height: options.height || VIDEO_HEIGHT_DEFAULT,
              title: options.title || '',
            },
          });
        },
      updateEmbedVideo:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EmbedVideo;
