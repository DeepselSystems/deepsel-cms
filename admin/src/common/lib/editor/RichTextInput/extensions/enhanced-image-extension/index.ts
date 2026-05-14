import { Node } from '@tiptap/core';
import type { Command } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView';
import {
  ENHANCED_IMAGE_ALIGNMENTS,
  ENHANCED_IMAGE_ATTRIBUTES,
  ENHANCED_IMAGE_CLASSES,
  IMAGE_WIDTH_DEFAULT,
} from './utils';

interface EnhancedImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  alignment?: string;
  rounded?: boolean;
  circle?: boolean;
  inline?: boolean;
  description?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedImage: {
      setEnhancedImage: (options: EnhancedImageAttributes) => ReturnType;
      updateEnhancedImage: (options: Partial<EnhancedImageAttributes>) => ReturnType;
    };
  }
}

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
          const wrapper = element.closest(`[${ENHANCED_IMAGE_ATTRIBUTES.WIDTH}]`);
          if (wrapper) {
            const dataWidth = wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH);
            if (dataWidth) {
              return parseInt(dataWidth, 10);
            }
          }
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
          const wrapper = element.closest(`[${ENHANCED_IMAGE_ATTRIBUTES.HEIGHT}]`);
          if (wrapper) {
            const dataHeight = wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT);
            if (dataHeight) {
              return parseInt(dataHeight, 10);
            }
          }
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
          const rounded = element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED);
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
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`,
          );
          return descriptionElement ? descriptionElement.textContent : '';
        },
        renderHTML: () => {
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
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`,
          );

          if (!img) return false;

          const dataWidth = element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH);
          const imgWidth = img.getAttribute('width');
          const parsedWidth = dataWidth
            ? parseInt(dataWidth, 10)
            : imgWidth
              ? parseInt(imgWidth, 10)
              : IMAGE_WIDTH_DEFAULT;

          const dataHeight = element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT);
          const imgHeight = img.getAttribute('height');
          const parsedHeight = dataHeight
            ? parseInt(dataHeight, 10)
            : imgHeight
              ? parseInt(imgHeight, 10)
              : null;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: parsedWidth,
            height: parsedHeight,
            alignment:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT) ||
              ENHANCED_IMAGE_ALIGNMENTS.CENTER,
            rounded: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED) !== 'false',
            circle: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE) === 'true',
            inline: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE) === 'true',
            description: descriptionElement ? descriptionElement.textContent : '',
          };
        },
      },
      {
        tag: `div.${ENHANCED_IMAGE_CLASSES.WRAPPER}`,
        getAttrs: (element) => {
          const img = element.querySelector('img');
          const descriptionElement = element.querySelector(
            `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`,
          );

          if (!img) return false;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH)
              ? parseInt(element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH)!, 10)
              : img.getAttribute('width')
                ? parseInt(img.getAttribute('width')!, 10)
                : IMAGE_WIDTH_DEFAULT,
            height: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT)
              ? parseInt(element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT)!, 10)
              : img.getAttribute('height')
                ? parseInt(img.getAttribute('height')!, 10)
                : null,
            alignment:
              element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT) ||
              ENHANCED_IMAGE_ALIGNMENTS.CENTER,
            rounded: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED) !== 'false',
            circle: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE) === 'true',
            inline: element.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE) === 'true',
            description: descriptionElement ? descriptionElement.textContent : '',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alignment, rounded, circle, inline, width, height, description } = node.attrs;

    if (!src) {
      return ['div', {}];
    }

    const attrs = JSON.stringify({
      alignment: alignment || ENHANCED_IMAGE_ALIGNMENTS.CENTER,
      rounded: rounded ?? true,
      circle: circle ?? false,
      inline: inline ?? false,
      width: width || IMAGE_WIDTH_DEFAULT,
      ...(height ? { height } : {}),
      ...(description ? { description } : {}),
    });

    return ['div', `{{ attachment('${src}', ${attrs}) }}`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEnhancedImage:
        (options: EnhancedImageAttributes): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateEnhancedImage:
        (options: Partial<EnhancedImageAttributes>): Command =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EnhancedImage;
