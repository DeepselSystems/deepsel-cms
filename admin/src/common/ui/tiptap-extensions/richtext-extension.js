import {Node, mergeAttributes} from '@tiptap/core';
import {Plugin, PluginKey} from 'prosemirror-state';

// RichText Node Extension for TipTap - allows recursive rich text editing
export const RichText = Node.create({
  name: 'richtext',

  // Define the richtext node attributes
  addAttributes() {
    return {
      richtextId: {
        default: null,
      },
      content: {
        default: '',
      },
      config: {
        default: {
          maxWidth: null,
          backgroundColor: '#f5f5f5',
          padding: 16,
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        },
      },
    };
  },

  // Define how the richtext node appears in the document
  group: 'block',
  content: '',
  marks: '',
  selectable: true,
  draggable: true,
  isolating: true,

  // Parse HTML to richtext node
  parseHTML() {
    return [
      {
        tag: 'div[data-type="richtext"]',
        getAttrs: (node) => {
          try {
            // Parse the stringified JSON attributes
            const configStr = node.getAttribute('data-config');
            const content = node.getAttribute('data-content');

            const parsedConfig = configStr
              ? JSON.parse(configStr)
              : {
                  maxWidth: null,
                  backgroundColor: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                };

            return {
              config: parsedConfig,
              content: content || '',
              richtextId: node.getAttribute('data-richtext-id') || null,
            };
          } catch (error) {
            console.error('Error parsing richtext attributes:', error);
            return {};
          }
        },
      },
    ];
  },

  // Render richtext node to HTML
  renderHTML({HTMLAttributes, node}) {
    // Get the richtext configuration and content
    const config = node.attrs.config || {
      maxWidth: null,
      backgroundColor: '#f5f5f5',
      padding: 16,
      borderRadius: 8,
      border: '1px solid #e0e0e0',
    };
    const content = node.attrs.content || '';
    const richtextId = node.attrs.richtextId || null;

    // Store the data for parsing later
    const dataAttrs = {
      'data-type': 'richtext',
      'data-richtext-id': richtextId,
      'data-config': JSON.stringify(config),
      'data-content': content,
    };

    // If we're in a server-side environment without window, just return the data attributes
    if (typeof window === 'undefined') {
      return ['div', mergeAttributes(dataAttrs)];
    }

    // Create the richtext HTML structure
    const richtextStyle = {
      margin: '1rem 0',
      padding: `${config.padding}px`,
      'background-color': config.backgroundColor,
      'border-radius': `${config.borderRadius}px`,
      border: config.border,
      ...(config.maxWidth
        ? {'max-width': `${config.maxWidth}px`, margin: '1rem auto'}
        : {}),
    };

    // Convert style object to string
    const styleStr = Object.entries(richtextStyle)
      .map(([key, value]) => `${key}: ${value};`)
      .join(' ');

    // Create the richtext container
    const richtextAttrs = {
      ...dataAttrs,
      class: 'richtext-container',
      style: styleStr,
    };

    // Return the complete richtext structure with content
    // We use a script tag to render the HTML content after the component is mounted
    return [
      'div',
      mergeAttributes(richtextAttrs),
      [
        'div',
        {class: 'richtext-content'},
        // Store content as text initially
        content,
      ],
      [
        'script',
        {},
        `(function() {
          // Get the parent richtext container
          const script = document.currentScript;
          const container = script.parentNode;
          const contentDiv = container.querySelector('.richtext-content');
          if (contentDiv) {
            // Get the HTML content and render it
            const htmlContent = contentDiv.textContent || contentDiv.innerText;
            if (htmlContent && htmlContent.trim().startsWith('<')) {
              contentDiv.innerHTML = htmlContent;
            }
          }
          // Remove this script after execution
          script.parentNode.removeChild(script);
        })();`,
      ],
    ];
  },

  // Add commands to insert and update richtext
  addCommands() {
    return {
      setRichText:
        (attributes) =>
        ({commands}) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateRichText:
        (attributes) =>
        ({commands, editor}) => {
          // Find the richtext node and update its attributes
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
      dom.classList.add('richtext-container');

      // Apply styling based on config
      let config = {
        maxWidth: null,
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        border: '1px solid #e0e0e0',
      };
      let content = '';

      // Handle both object and string formats for backward compatibility
      if (node.attrs.config) {
        config =
          typeof node.attrs.config === 'string'
            ? JSON.parse(node.attrs.config)
            : node.attrs.config;
      }

      if (node.attrs.content) {
        content = node.attrs.content;
      }

      // Set container styles
      dom.style.margin = '1rem 0';
      dom.style.padding = `${config.padding}px`;
      dom.style.backgroundColor = config.backgroundColor;
      dom.style.borderRadius = `${config.borderRadius}px`;
      dom.style.border = config.border;

      if (config.maxWidth) {
        dom.style.maxWidth = `${config.maxWidth}px`;
        dom.style.margin = '1rem auto';
      }

      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.classList.add('richtext-content');

      // Set the content safely
      if (content) {
        // Directly set innerHTML to properly render the HTML content
        contentContainer.innerHTML = content;
      }

      dom.appendChild(contentContainer);

      // Add edit button that appears on hover
      const editButton = document.createElement('button');
      editButton.classList.add('richtext-edit-button');
      editButton.setAttribute('type', 'button'); // Prevent form submission
      editButton.innerHTML = 'Edit Content';
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

        // Dispatch custom event to open richtext modal
        const event = new CustomEvent('editRichText', {
          detail: {
            richtextId: node.attrs.richtextId,
            config: node.attrs.config,
            content: node.attrs.content || '',
            updateRichText: (newAttrs) => {
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

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'richtext') return false;

          // Update with new content and config
          let updatedConfig = {
            maxWidth: null,
            backgroundColor: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e0e0e0',
          };
          let updatedContent = '';

          // Handle both object and string formats for backward compatibility
          if (updatedNode.attrs.config) {
            updatedConfig =
              typeof updatedNode.attrs.config === 'string'
                ? JSON.parse(updatedNode.attrs.config)
                : updatedNode.attrs.config;
          }

          if (updatedNode.attrs.content) {
            updatedContent = updatedNode.attrs.content;
          }

          // Update container styles
          dom.style.padding = `${updatedConfig.padding}px`;
          dom.style.backgroundColor = updatedConfig.backgroundColor;
          dom.style.borderRadius = `${updatedConfig.borderRadius}px`;
          dom.style.border = updatedConfig.border;

          if (updatedConfig.maxWidth) {
            dom.style.maxWidth = `${updatedConfig.maxWidth}px`;
          } else {
            dom.style.maxWidth = '';
          }

          // Update content
          // Clear existing content and set new content
          if (updatedContent) {
            contentContainer.innerHTML = updatedContent;
          } else {
            contentContainer.innerHTML = '';
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

  // Add plugin to handle richtext interactions
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('richtextPlugin'),
        view: () => ({
          update: (view) => {
            // Find all richtext containers and render their content properly
            setTimeout(() => {
              const richtextContainers = document.querySelectorAll(
                '.richtext-container'
              );
              richtextContainers.forEach((container) => {
                const contentDiv = container.querySelector('.richtext-content');
                if (contentDiv) {
                  const htmlContent =
                    contentDiv.textContent || contentDiv.innerText;
                  if (htmlContent && htmlContent.trim().startsWith('<')) {
                    // Only process if it looks like HTML content
                    contentDiv.innerHTML = htmlContent;
                  }
                }
              });
            }, 0);
            return true;
          },
        }),
      }),
    ];
  },
});

export default RichText;
