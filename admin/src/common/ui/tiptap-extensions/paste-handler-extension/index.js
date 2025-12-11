import {Node} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {ReactNodeViewRenderer} from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView.jsx';
import {PASTE_HANDLER_ATTRIBUTES} from './utils.js';

/**
 * Paste Handler extension for TipTap
 * Temporarily displays pasted files in the editor before they are uploaded
 * This is a transient node that should not be persisted to database
 */
export const PasteHandler = Node.create({
  name: 'pasteHandler',

  group: 'block',

  // Leaf node - cannot contain child content
  atom: true,

  addOptions() {
    return {
      enabled: true,
      onPaste: null,
      HTMLAttributes: {},
    };
  },

  /**
   * Define node attributes
   * Files array temporarily holds pasted File objects for display
   */
  addAttributes() {
    return {
      files: {
        default: [],
      },
    };
  },

  /**
   * Parse HTML to node (for editor initialization)
   * This should rarely be triggered as the node is transient
   */
  parseHTML() {
    return [
      {
        tag: `div[${PASTE_HANDLER_ATTRIBUTES.CONTAINER}]`,
      },
    ];
  },

  /**
   * Render node to HTML (for serialization)
   * Returns hidden div since this node is transient and should not appear in saved content
   * The node is removed after files are uploaded via EditorNodeView component
   */
  renderHTML() {
    return [
      'div',
      {[PASTE_HANDLER_ATTRIBUTES.CONTAINER]: '', style: 'display: none;'},
    ];
  },

  /**
   * Custom React component for editor display
   * Shows file list with upload progress and handles file upload
   */
  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  /**
   * Define editor commands
   * setPastedFiles: Insert pasted files as a temporary node in the editor
   */
  addCommands() {
    return {
      setPastedFiles:
        (options) =>
        ({commands}) => {
          if (!options.files || options.files.length === 0) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              files: options.files,
            },
          });
        },
    };
  },

  /**
   * Add ProseMirror plugin to intercept paste events
   * Detects file pastes and creates temporary pasteHandler nodes
   */
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('pasteHandler'),
        props: {
          handlePaste: (view, event) => {
            // Intercept paste events containing files
            if (event.clipboardData && event.clipboardData.files.length > 0) {
              const files = Array.from(event.clipboardData.files);

              // Create temporary node to display pasted files
              if (editor) {
                editor.commands.setPastedFiles({files});
                return true; // Prevent default paste behavior
              }
            }

            // Allow default paste for text/HTML content
            return false;
          },
        },
      }),
    ];
  },
});

export default PasteHandler;
