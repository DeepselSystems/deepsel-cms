import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView.jsx';
import { EMBED_AUDIO_ATTRIBUTES, EMBED_AUDIO_CLASSES, AUDIO_WIDTH_DEFAULT } from './utils.js';

/**
 * Embed Audio extension for TipTap
 * Allows embedding audio files with basic player controls
 */
export const EmbedAudio = Node.create({
  name: 'embedAudio',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: EMBED_AUDIO_CLASSES.WRAPPER,
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          return (
            element.getAttribute(EMBED_AUDIO_ATTRIBUTES.SRC) ||
            element.querySelector('audio')?.getAttribute('src') ||
            null
          );
        },
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            [EMBED_AUDIO_ATTRIBUTES.SRC]: attributes.src,
          };
        },
      },
      width: {
        default: AUDIO_WIDTH_DEFAULT,
        parseHTML: (element) => {
          const width =
            element.getAttribute(EMBED_AUDIO_ATTRIBUTES.WIDTH) ||
            element.querySelector('audio')?.getAttribute('width');
          return width ? parseInt(width, 10) : AUDIO_WIDTH_DEFAULT;
        },
        renderHTML: (attributes) => {
          return {
            [EMBED_AUDIO_ATTRIBUTES.WIDTH]:
              attributes.width?.toString() || AUDIO_WIDTH_DEFAULT.toString(),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${EMBED_AUDIO_ATTRIBUTES.CONTAINER}]`,
      },
      {
        tag: `div.${EMBED_AUDIO_CLASSES.WRAPPER}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, width } = node.attrs;

    // Create audio element
    const audioElement = [
      'div',
      {
        class: EMBED_AUDIO_CLASSES.AUDIO_CONTAINER,
      },
      [
        'audio',
        {
          src: src,
          controls: true,
          class: EMBED_AUDIO_CLASSES.AUDIO_CONTENT,
        },
      ],
    ];

    // Build elements array
    const elements = [audioElement];

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        [EMBED_AUDIO_ATTRIBUTES.CONTAINER]: 'true',
        [EMBED_AUDIO_ATTRIBUTES.SRC]: src,
        [EMBED_AUDIO_ATTRIBUTES.WIDTH]: width?.toString() || AUDIO_WIDTH_DEFAULT.toString(),
      }),
      ...elements,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEmbedAudio:
        (options) =>
        ({ commands }) => {
          if (!options.src) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              width: options.width || AUDIO_WIDTH_DEFAULT,
            },
          });
        },
      updateEmbedAudio:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EmbedAudio;
