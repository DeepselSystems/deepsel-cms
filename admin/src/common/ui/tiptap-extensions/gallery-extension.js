import {Node, mergeAttributes} from '@tiptap/core';
import {Plugin, PluginKey} from 'prosemirror-state';
import {getAttachmentRelativeUrl} from '../../utils/index.js';

// Gallery Node Extension for TipTap
export const Gallery = Node.create({
  name: 'gallery',

  // Define the gallery node attributes
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

  // Define how the gallery node appears in the document
  group: 'block',
  content: '',
  marks: '',
  selectable: true,
  draggable: true,
  isolating: true,

  // Parse HTML to gallery node
  parseHTML() {
    return [
      {
        tag: 'div[data-type="gallery"]',
        getAttrs: (node) => {
          try {
            // Parse the stringified JSON attributes
            const configStr = node.getAttribute('data-config');
            const attachmentsStr = node.getAttribute('data-attachments');

            const parsedConfig = configStr
              ? JSON.parse(configStr)
              : {imagesPerRow: 3, gap: 4, maxWidth: null, rounded: true};
            const parsedAttachments = attachmentsStr
              ? JSON.parse(attachmentsStr)
              : [];

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

  // Render gallery node to HTML
  renderHTML({HTMLAttributes, node}) {
    // Get the gallery configuration and attachments
    const config = node.attrs.config || {
      imagesPerRow: 3,
      gap: 4,
      rounded: true,
    };
    const attachments = node.attrs.attachments || [];
    const galleryId = node.attrs.galleryId || null;

    // Clean up attachment data - only keep necessary fields
    const cleanAttachments = attachments.map((attachment) => {
      // Only keep the essential fields needed for rendering
      return {
        name: attachment.name,
        alt_text: attachment.alt_text || '',
        caption: attachment.caption || '',
      };
    });

    // Store the data for parsing later
    const dataAttrs = {
      'data-type': 'gallery',
      'data-gallery-id': galleryId,
      'data-config': JSON.stringify(config),
      'data-attachments': JSON.stringify(cleanAttachments),
    };

    // If we're in a server-side environment without window, just return the data attributes
    if (typeof window === 'undefined') {
      return ['div', mergeAttributes(dataAttrs)];
    }

    // Create the gallery HTML structure
    const galleryStyle = {
      display: 'grid',
      'grid-template-columns': `repeat(${config.imagesPerRow}, 1fr)`,
      gap: `${config.gap}px`,
      margin: '1rem 0',
      ...(config.maxWidth
        ? {'max-width': `${config.maxWidth}px`, margin: '1rem auto'}
        : {}),
    };

    // Convert style object to string
    const styleStr = Object.entries(galleryStyle)
      .map(([key, value]) => `${key}: ${value};`)
      .join(' ');

    // Create the gallery container
    const galleryAttrs = {
      ...dataAttrs,
      class: 'gallery-container',
      style: styleStr,
    };

    // If no attachments, return empty gallery with placeholder
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

    // Create image elements for each attachment
    const imageElements = cleanAttachments.map((attachment) => {
      const imageContainer = [
        'div',
        {class: 'gallery-image-container'},
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

      // Add caption if it exists
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

    // Return the complete gallery structure
    return ['div', mergeAttributes(galleryAttrs), ...imageElements];
  },

  // Add commands to insert and update gallery
  addCommands() {
    return {
      setGallery:
        (attributes) =>
        ({commands}) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateGallery:
        (attributes) =>
        ({commands, editor}) => {
          // Find the gallery node and update its attributes
          if (editor.isActive(this.name)) {
            return commands.updateAttributes(this.name, attributes);
          }
          return false;
        },
    };
  },

  // Add custom node view
  addNodeView() {
    return ({node, editor, getPos}) => {
      const dom = document.createElement('div');
      dom.classList.add('gallery-container');

      // Apply styling based on config
      let config = {imagesPerRow: 3, gap: 4, rounded: true};
      let attachments = [];

      // Handle both object and string formats for backward compatibility
      if (node.attrs.config) {
        config =
          typeof node.attrs.config === 'string'
            ? JSON.parse(node.attrs.config)
            : node.attrs.config;
      }

      if (node.attrs.attachments) {
        attachments =
          typeof node.attrs.attachments === 'string'
            ? JSON.parse(node.attrs.attachments)
            : node.attrs.attachments;
      }

      // Set container styles
      dom.style.display = 'grid';
      dom.style.gridTemplateColumns = `repeat(${config.imagesPerRow}, 1fr)`;
      dom.style.gap = `${config.gap}px`;
      dom.style.margin = '1rem 0';

      if (config.maxWidth) {
        dom.style.maxWidth = `${config.maxWidth}px`;
        dom.style.margin = '1rem auto';
      }

      // Create gallery images
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

        // Add caption if it exists
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

      // Add edit button that appears on hover
      const editButton = document.createElement('button');
      editButton.classList.add('gallery-edit-button');
      editButton.setAttribute('type', 'button'); // Prevent form submission
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

      // Show edit button on hover
      dom.addEventListener('mouseenter', () => {
        editButton.style.display = 'block';
      });

      dom.addEventListener('mouseleave', () => {
        editButton.style.display = 'none';
      });

      // Edit button click handler
      editButton.addEventListener('click', (e) => {
        // Prevent default button behavior and event bubbling
        e.preventDefault();
        e.stopPropagation();
        // Dispatch custom event to open gallery modal
        const event = new CustomEvent('editGallery', {
          detail: {
            galleryId: node.attrs.galleryId,
            config: node.attrs.config,
            attachments: node.attrs.attachments,
            updateGallery: (newAttrs) => {
              const pos = getPos();
              const transaction = editor.view.state.tr.setNodeMarkup(
                pos,
                undefined,
                {...node.attrs, ...newAttrs}
              );
              editor.view.dispatch(transaction);
            },
          },
        });
        window.dispatchEvent(event);
      });

      // Add the edit button to the container
      dom.style.position = 'relative';
      dom.appendChild(editButton);

      // If no attachments, show placeholder
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

          // Clear existing content
          while (dom.firstChild) {
            dom.removeChild(dom.firstChild);
          }

          // Update with new content
          let updatedConfig = {imagesPerRow: 3, gap: 4, rounded: true};
          let updatedAttachments = [];

          // Handle both object and string formats for backward compatibility
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

          // Update container styles
          dom.style.gridTemplateColumns = `repeat(${updatedConfig.imagesPerRow}, 1fr)`;
          dom.style.gap = `${updatedConfig.gap}px`;

          if (updatedConfig.maxWidth) {
            dom.style.maxWidth = `${updatedConfig.maxWidth}px`;
          } else {
            dom.style.maxWidth = '';
          }

          // Recreate gallery images
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

            // Add caption if it exists
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

          // Re-add edit button
          dom.appendChild(editButton);

          // If no attachments, show placeholder
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
          // Clean up event listeners
          dom.removeEventListener('mouseenter', () => {});
          dom.removeEventListener('mouseleave', () => {});
          editButton.removeEventListener('click', () => {});
        },
      };
    };
  },

  // Add plugin to handle gallery interactions
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('galleryPlugin'),
      }),
    ];
  },
});

export default Gallery;
