import { mergeAttributes, Node } from '@tiptap/core';
import {
  AUTHENTICATED_CONTENT_ATTRIBUTES,
  AUTHENTICATED_CONTENT_CLASSES,
  AUTHENTICATED_CONTENT_DEFAULT_CONTENT,
} from './utils.js';

/**
 * Authenticated Content extension for TipTap
 * Allows defining regions that are only visible to authenticated users
 */
export const AuthenticatedContent = Node.create({
  name: 'authenticatedContent',

  group: 'block',

  content: 'text*',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: AUTHENTICATED_CONTENT_CLASSES.WRAPPER,
      },
    };
  },

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [
      {
        tag: `div[${AUTHENTICATED_CONTENT_ATTRIBUTES.CONTAINER}]`,
      },
      {
        tag: `div.${AUTHENTICATED_CONTENT_CLASSES.WRAPPER}`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        [AUTHENTICATED_CONTENT_ATTRIBUTES.CONTAINER]: 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAuthenticatedContent:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'text',
                text: AUTHENTICATED_CONTENT_DEFAULT_CONTENT,
              },
            ],
          });
        },
    };
  },
});

export default AuthenticatedContent;
