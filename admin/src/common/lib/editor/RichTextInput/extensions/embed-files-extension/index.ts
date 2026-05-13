import { Node } from '@tiptap/core';
import type { Command } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorNodeView from './components/EditorNodeView';
import { EMBED_FILES_ATTRIBUTES, MAX_FILES_COUNT, formatJinjaSyntax } from './utils';
import type { EmbedFileItem } from './types';

interface EmbedFilesOptions {
  files: EmbedFileItem[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedFiles: {
      setEmbedFiles: (options: EmbedFilesOptions) => ReturnType;
    };
  }
}

/**
 * Embed Files extension for TipTap.
 * Each file reference is stored as {{ attachment('name') }} Jinja syntax in the rendered HTML.
 * The backend resolves this at page-render time to a locale-appropriate download link.
 *
 * @example
 * ```typescript
 * import { EmbedFiles } from './extensions/embed-files-extension';
 *
 * const editor = useEditor({
 *   extensions: [
 *     EmbedFiles.configure({
 *       backendHost: 'https://api.example.com',
 *       user: user,
 *       setUser: setUser,
 *     }),
 *   ],
 * });
 * ```
 */
export const EmbedFiles = Node.create({
  name: 'embedFiles',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      backendHost: '',
      user: null,
      setUser: () => {},
    };
  },

  addAttributes() {
    return {
      files: {
        default: [],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${EMBED_FILES_ATTRIBUTES.CONTAINER}]`,
      },
    ];
  },

  renderHTML({ node }) {
    const { files } = node.attrs as { files: EmbedFileItem[] };

    if (!files || files.length === 0) {
      return ['div', {}];
    }

    const jinjaContent = files.map((f) => formatJinjaSyntax(f.attachmentName)).join('\n');

    return ['div', { [EMBED_FILES_ATTRIBUTES.CONTAINER]: 'true' }, jinjaContent];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorNodeView);
  },

  addCommands() {
    return {
      setEmbedFiles:
        (options: EmbedFilesOptions): Command =>
        ({ commands }) => {
          if (!options.files || options.files.length === 0) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: { files: options.files.slice(0, MAX_FILES_COUNT) },
          });
        },
    };
  },
});

export default EmbedFiles;
