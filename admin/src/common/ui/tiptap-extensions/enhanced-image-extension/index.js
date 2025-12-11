import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView.jsx';
import {
  ENHANCED_IMAGE_ATTRIBUTES,
  ENHANCED_IMAGE_ALIGNMENTS,
  ENHANCED_IMAGE_CLASSES,
  IMAGE_WIDTH_DEFAULT,
} from './utils.js';

/**
 * Enhanced Image extension with description support
 * Extends the basic image functionality with optional description field
 */
export const EnhancedImage = Node.create({
  name: 'enhancedImage',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: ENHANCED_IMAGE_CLASSES.WRAPPER,
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            src: attributes.src,
          };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) {
            return {};
          }
          return {
            alt: attributes.alt,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }
          return {
            title: attributes.title,
          };
        },
      },
      width: {
        default: IMAGE_WIDTH_DEFAULT,
        parseHTML: (element) => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : IMAGE_WIDTH_DEFAULT;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
      alignment: {
        default: ENHANCED_IMAGE_ALIGNMENTS.CENTER,
        parseHTML: (element) =>
          element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT) ||
          ENHANCED_IMAGE_ALIGNMENTS.CENTER,
        renderHTML: (attributes) => {
          if (!attributes.alignment) {
            return {};
          }
          return {
            [ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT]: attributes.alignment,
          };
        },
      },
      rounded: {
        default: true,
        parseHTML: (element) => {
          const rounded = element.getAttribute(
            ENHANCED_IMAGE_ATTRIBUTES.ROUNDED
          );
          return rounded !== 'false';
        },
        renderHTML: (attributes) => {
          return {
            [ENHANCED_IMAGE_ATTRIBUTES.ROUNDED]: attributes.rounded?.toString(),
          };
        },
      },
      circle: {
        default: false,
        parseHTML: (element) => {
          const circle = element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE);
          return circle === 'true';
        },
        renderHTML: (attributes) => {
          return {
            [ENHANCED_IMAGE_ATTRIBUTES.CIRCLE]: attributes.circle?.toString(),
          };
        },
      },
      inline: {
        default: false,
        parseHTML: (element) => {
          const inline = element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE);
          return inline === 'true';
        },
        renderHTML: (attributes) => {
          return {
            [ENHANCED_IMAGE_ATTRIBUTES.INLINE]: attributes.inline?.toString(),
          };
        },
      },
      description: {
        default: '',
        parseHTML: (element) => {
          const descriptionElement = element.querySelector(
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`
          );
          return descriptionElement ? descriptionElement.textContent : '';
        },
        renderHTML: () => {
          // Description is rendered separately in the HTML structure
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${ENHANCED_IMAGE_ATTRIBUTES.CONTAINER}]`,
        getAttrs: (element) => {
          const img = element.querySelector('img');
          const descriptionElement = element.querySelector(
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`
          );

          if (!img) return false;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH)
              ? parseInt(
                  element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH),
                  10
                )
              : img.getAttribute('width')
                ? parseInt(img.getAttribute('width'), 10)
                : IMAGE_WIDTH_DEFAULT,
            height: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT)
              ? parseInt(
                  element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT),
                  10
                )
              : img.getAttribute('height')
                ? parseInt(img.getAttribute('height'), 10)
                : null,
            alignment:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT) ||
              ENHANCED_IMAGE_ALIGNMENTS.CENTER,
            rounded:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED) !==
              'false',
            circle:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE) === 'true',
            inline:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE) === 'true',
            description: descriptionElement
              ? descriptionElement.textContent
              : '',
          };
        },
      },
      {
        tag: `div.${ENHANCED_IMAGE_CLASSES.WRAPPER}`,
        getAttrs: (element) => {
          const img = element.querySelector('img');
          const descriptionElement = element.querySelector(
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`
          );

          if (!img) return false;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH)
              ? parseInt(
                  element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH),
                  10
                )
              : img.getAttribute('width')
                ? parseInt(img.getAttribute('width'), 10)
                : IMAGE_WIDTH_DEFAULT,
            height: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT)
              ? parseInt(
                  element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT),
                  10
                )
              : img.getAttribute('height')
                ? parseInt(img.getAttribute('height'), 10)
                : null,
            alignment:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT) ||
              ENHANCED_IMAGE_ALIGNMENTS.CENTER,
            rounded:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED) !==
              'false',
            circle:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE) === 'true',
            inline:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE) === 'true',
            description: descriptionElement
              ? descriptionElement.textContent
              : '',
          };
        },
      },
    ];
  },

  renderHTML({node, HTMLAttributes}) {
    const {description, alignment, rounded, circle, inline} = node.attrs;

    // Create image element
    const imgElement = [
      'img',
      mergeAttributes(HTMLAttributes, {
        src: node.attrs.src,
        alt: node.attrs.alt,
        title: node.attrs.title,
        width: node.attrs.width,
        height: node.attrs.height,
        style: circle
          ? 'border-radius: 50%; aspect-ratio: 1; object-fit: cover;'
          : rounded
            ? 'border-radius: 6px;'
            : '',
      }),
    ];

    // Create description element if description exists
    const descriptionElement =
      description && description.trim()
        ? [
            'div',
            {
              class: ENHANCED_IMAGE_CLASSES.DESCRIPTION,
            },
            description,
          ]
        : null;

    // Create wrapper with alignment styles based on inline mode
    let alignmentStyles;
    if (inline) {
      // Inline mode: float image to allow text wrapping
      alignmentStyles = {
        [ENHANCED_IMAGE_ALIGNMENTS.LEFT]:
          'display: inline-block; float: left; margin: 0 1rem 1rem 0; width: fit-content;',
        [ENHANCED_IMAGE_ALIGNMENTS.RIGHT]:
          'display: inline-block; float: right; margin: 0 0 1rem 1rem; width: fit-content;',
        [ENHANCED_IMAGE_ALIGNMENTS.CENTER]:
          'display: inline-block; float: left; margin: 0 1rem 1rem 0; width: fit-content;',
      };
    } else {
      // Block mode: standard alignment
      alignmentStyles = {
        [ENHANCED_IMAGE_ALIGNMENTS.CENTER]:
          'display: block; text-align: center; margin: 0 auto; width: fit-content;',
        [ENHANCED_IMAGE_ALIGNMENTS.LEFT]:
          'display: block; text-align: left; margin-left: 0; margin-right: auto; width: fit-content;',
        [ENHANCED_IMAGE_ALIGNMENTS.RIGHT]:
          'display: block; text-align: right; margin-left: auto; margin-right: 0; width: fit-content;',
      };
    }

    const elements = [imgElement];
    if (descriptionElement) {
      elements.push(descriptionElement);
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        class: ENHANCED_IMAGE_CLASSES.WRAPPER,
        [ENHANCED_IMAGE_ATTRIBUTES.CONTAINER]: 'true',
        [ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT]: alignment,
        [ENHANCED_IMAGE_ATTRIBUTES.ROUNDED]: rounded?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.CIRCLE]: circle?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.INLINE]: inline?.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.WIDTH]:
          node.attrs.width?.toString() || IMAGE_WIDTH_DEFAULT.toString(),
        [ENHANCED_IMAGE_ATTRIBUTES.HEIGHT]: node.attrs.height?.toString() || '',
        [ENHANCED_IMAGE_ATTRIBUTES.DESCRIPTION]: description || '',
        style:
          alignmentStyles[alignment] ||
          alignmentStyles[ENHANCED_IMAGE_ALIGNMENTS.CENTER],
      }),
      ...elements,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEnhancedImage:
        (options) =>
        ({commands}) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateEnhancedImage:
        (options) =>
        ({commands}) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EnhancedImage;
