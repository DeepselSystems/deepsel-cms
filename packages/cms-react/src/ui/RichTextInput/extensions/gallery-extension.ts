import { mergeAttributes, Node } from '@tiptap/core';
import type { Command } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { getAttachmentRelativeUrl } from '@deepsel/cms-utils/common/utils';

interface GalleryConfig {
  imagesPerRow: number;
  gap: number;
  maxWidth: number | null;
  rounded: boolean;
}

interface GalleryAttachment {
  name: string;
  alt_text?: string;
  caption?: string;
}

interface GalleryAttributes {
  galleryId: string | null;
  config: GalleryConfig;
  attachments: GalleryAttachment[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gallery: {
      setGallery: (attributes: Partial<GalleryAttributes>) => ReturnType;
      updateGallery: (attributes: Partial<GalleryAttributes>) => ReturnType;
    };
  }
}

export const Gallery = Node.create({
  name: 'gallery',

  addAttributes() {
    return {
      galleryId: {
        default: null,
      },
      config: {
        default: {
          imagesPerRow: 3,
          gap: 4,
          maxWidth: null,
          rounded: true,
        },
      },
      attachments: {
        default: [],
      },
    };
  },

  group: 'block',
  content: '',
  marks: '',
  selectable: true,
  draggable: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="gallery"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return {};

          try {
            const configStr = node.getAttribute('data-config');
            const attachmentsStr = node.getAttribute('data-attachments');

            const parsedConfig = configStr
              ? JSON.parse(configStr)
              : { imagesPerRow: 3, gap: 4, maxWidth: null, rounded: true };
            const parsedAttachments = attachmentsStr ? JSON.parse(attachmentsStr) : [];

            return {
              config: parsedConfig,
              attachments: parsedAttachments,
              galleryId: node.getAttribute('data-gallery-id') || null,
            };
          } catch (error) {
            console.error('Error parsing gallery attributes:', error);
            return {};
          }
        },
      },
    ];
  },

  renderHTML({ node }) {
    const config = (node.attrs.config as GalleryConfig) || {
      imagesPerRow: 3,
      gap: 4,
      rounded: true,
      maxWidth: null,
    };
    const attachments = (node.attrs.attachments as GalleryAttachment[]) || [];
    const galleryId = node.attrs.galleryId || null;

    const cleanAttachments = attachments.map((attachment) => ({
      name: attachment.name,
      alt_text: attachment.alt_text || '',
      caption: attachment.caption || '',
    }));

    const dataAttrs = {
      'data-type': 'gallery',
      'data-gallery-id': galleryId,
      'data-config': JSON.stringify(config),
      'data-attachments': JSON.stringify(cleanAttachments),
    };

    if (typeof window === 'undefined') {
      return ['div', mergeAttributes(dataAttrs)];
    }

    const galleryStyle: Record<string, string> = {
      display: 'grid',
      'grid-template-columns': `repeat(${config.imagesPerRow}, 1fr)`,
      gap: `${config.gap}px`,
      margin: '1rem 0',
      ...(config.maxWidth ? { 'max-width': `${config.maxWidth}px`, margin: '1rem auto' } : {}),
    };

    const styleStr = Object.entries(galleryStyle)
      .map(([key, value]) => `${key}: ${value};`)
      .join(' ');

    const galleryAttrs = {
      ...dataAttrs,
      class: 'gallery-container',
      style: styleStr,
    };

    if (attachments.length === 0) {
      return [
        'div',
        mergeAttributes(galleryAttrs),
        [
          'div',
          {
            style: `grid-column: span ${config.imagesPerRow}; padding: 2rem; background-color: #f5f5f5; border-radius: 6px; text-align: center; color: #888;`,
          },
          'Empty Gallery',
        ],
      ];
    }

    const imageElements = cleanAttachments.map((attachment) => {
      const imageContainer: unknown[] = [
        'div',
        { class: 'gallery-image-container' },
        [
          'img',
          {
            src: getAttachmentRelativeUrl(attachment.name),
            alt: attachment.alt_text || '',
            class: 'gallery-image',
            style: `width: 100%; height: auto; object-fit: cover; aspect-ratio: 1 / 1; ${config.rounded ? 'border-radius: 6px;' : ''}`,
          },
        ],
      ];

      if (attachment.caption) {
        imageContainer.push([
          'div',
          {
            class: 'gallery-image-caption',
            style:
              'padding: 8px 4px; font-size: 14px; color: #666; text-align: center; line-height: 1.4; word-wrap: break-word;',
          },
          attachment.caption,
        ]);
      }

      return imageContainer;
    });

    return ['div', mergeAttributes(galleryAttrs), ...imageElements];
  },

  addCommands() {
    return {
      setGallery:
        (attributes: Partial<GalleryAttributes>): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateGallery:
        (attributes: Partial<GalleryAttributes>): Command =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.updateAttributes(this.name, attributes);
          }
          return false;
        },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.classList.add('gallery-container');

      let config: GalleryConfig = { imagesPerRow: 3, gap: 4, rounded: true, maxWidth: null };
      let attachments: GalleryAttachment[] = [];

      if (node.attrs.config) {
        config =
          typeof node.attrs.config === 'string' ? JSON.parse(node.attrs.config) : node.attrs.config;
      }

      if (node.attrs.attachments) {
        attachments =
          typeof node.attrs.attachments === 'string'
            ? JSON.parse(node.attrs.attachments)
            : node.attrs.attachments;
      }

      dom.style.display = 'grid';
      dom.style.gridTemplateColumns = `repeat(${config.imagesPerRow}, 1fr)`;
      dom.style.gap = `${config.gap}px`;
      dom.style.margin = '1rem 0';

      if (config.maxWidth) {
        dom.style.maxWidth = `${config.maxWidth}px`;
        dom.style.margin = '1rem auto';
      }

      attachments.forEach((attachment) => {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('gallery-image-container');

        const img = document.createElement('img');
        img.src = getAttachmentRelativeUrl(attachment.name);
        img.alt = attachment.alt_text || '';
        img.classList.add('gallery-image');
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'cover';
        img.style.aspectRatio = '1 / 1';

        if (config.rounded) {
          img.style.borderRadius = '6px';
        }

        imgContainer.appendChild(img);

        if (attachment.caption) {
          const caption = document.createElement('div');
          caption.classList.add('gallery-image-caption');
          caption.textContent = attachment.caption;
          caption.style.padding = '8px 4px';
          caption.style.fontSize = '14px';
          caption.style.color = '#666';
          caption.style.textAlign = 'center';
          caption.style.lineHeight = '1.4';
          caption.style.wordWrap = 'break-word';
          imgContainer.appendChild(caption);
        }

        dom.appendChild(imgContainer);
      });

      const editButton = document.createElement('button');
      editButton.classList.add('gallery-edit-button');
      editButton.setAttribute('type', 'button');
      editButton.innerHTML = 'Edit Gallery';
      editButton.style.position = 'absolute';
      editButton.style.top = '10px';
      editButton.style.right = '10px';
      editButton.style.backgroundColor = 'white';
      editButton.style.border = '1px solid #ddd';
      editButton.style.borderRadius = '4px';
      editButton.style.padding = '4px 8px';
      editButton.style.fontSize = '12px';
      editButton.style.cursor = 'pointer';
      editButton.style.display = 'none';
      editButton.style.zIndex = '10';

      dom.addEventListener('mouseenter', () => {
        editButton.style.display = 'block';
      });

      dom.addEventListener('mouseleave', () => {
        editButton.style.display = 'none';
      });

      editButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const event = new CustomEvent('editGallery', {
          detail: {
            galleryId: node.attrs.galleryId,
            config: node.attrs.config,
            attachments: node.attrs.attachments,
            updateGallery: (newAttrs: Partial<GalleryAttributes>) => {
              const pos = getPos();
              if (typeof pos === 'number') {
                const transaction = editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  ...newAttrs,
                });
                editor.view.dispatch(transaction);
              }
            },
          },
        });
        window.dispatchEvent(event);
      });

      dom.style.position = 'relative';
      dom.appendChild(editButton);

      if (attachments.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.classList.add('gallery-placeholder');
        placeholder.textContent = 'Empty Gallery - Click to Edit';
        placeholder.style.gridColumn = `span ${config.imagesPerRow}`;
        placeholder.style.padding = '2rem';
        placeholder.style.backgroundColor = '#f5f5f5';
        placeholder.style.borderRadius = '6px';
        placeholder.style.textAlign = 'center';
        placeholder.style.color = '#888';

        dom.appendChild(placeholder);
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'gallery') return false;

          while (dom.firstChild) {
            dom.removeChild(dom.firstChild);
          }

          let updatedConfig: GalleryConfig = {
            imagesPerRow: 3,
            gap: 4,
            rounded: true,
            maxWidth: null,
          };
          let updatedAttachments: GalleryAttachment[] = [];

          if (updatedNode.attrs.config) {
            updatedConfig =
              typeof updatedNode.attrs.config === 'string'
                ? JSON.parse(updatedNode.attrs.config)
                : updatedNode.attrs.config;
          }

          if (updatedNode.attrs.attachments) {
            updatedAttachments =
              typeof updatedNode.attrs.attachments === 'string'
                ? JSON.parse(updatedNode.attrs.attachments)
                : updatedNode.attrs.attachments;
          }

          dom.style.gridTemplateColumns = `repeat(${updatedConfig.imagesPerRow}, 1fr)`;
          dom.style.gap = `${updatedConfig.gap}px`;

          if (updatedConfig.maxWidth) {
            dom.style.maxWidth = `${updatedConfig.maxWidth}px`;
          } else {
            dom.style.maxWidth = '';
          }

          updatedAttachments.forEach((attachment) => {
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('gallery-image-container');

            const img = document.createElement('img');
            img.src = getAttachmentRelativeUrl(attachment.name);
            img.alt = attachment.alt_text || '';
            img.classList.add('gallery-image');
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.objectFit = 'cover';
            img.style.aspectRatio = '1 / 1';

            if (updatedConfig.rounded) {
              img.style.borderRadius = '6px';
            }

            imgContainer.appendChild(img);

            if (attachment.caption) {
              const caption = document.createElement('div');
              caption.classList.add('gallery-image-caption');
              caption.textContent = attachment.caption;
              caption.style.padding = '8px 4px';
              caption.style.fontSize = '14px';
              caption.style.color = '#666';
              caption.style.textAlign = 'center';
              caption.style.lineHeight = '1.4';
              caption.style.wordWrap = 'break-word';
              imgContainer.appendChild(caption);
            }

            dom.appendChild(imgContainer);
          });

          dom.appendChild(editButton);

          if (updatedAttachments.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('gallery-placeholder');
            placeholder.textContent = 'Empty Gallery - Click to Edit';
            placeholder.style.gridColumn = `span ${updatedConfig.imagesPerRow}`;
            placeholder.style.padding = '2rem';
            placeholder.style.backgroundColor = '#f5f5f5';
            placeholder.style.borderRadius = '6px';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = '#888';

            dom.appendChild(placeholder);
          }

          return true;
        },
        destroy: () => {
          dom.removeEventListener('mouseenter', () => {});
          dom.removeEventListener('mouseleave', () => {});
          editButton.removeEventListener('click', () => {});
        },
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('galleryPlugin'),
      }),
    ];
  },
});

export default Gallery;
