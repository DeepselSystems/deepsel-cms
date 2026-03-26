import { mergeAttributes, Node } from "@tiptap/core";
import type { Command } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import EditorNodeView from "./components/EditorNodeView";
import {
  EMBED_FILES_ATTRIBUTES,
  EMBED_FILES_CLASSES,
  MAX_FILES_COUNT,
} from "./utils";
import { getAttachmentRelativeUrl } from "@deepsel/cms-utils";
import type { EmbedFileItem } from "./types";

interface EmbedFilesOptions {
  files: EmbedFileItem[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embedFiles: {
      setEmbedFiles: (options: EmbedFilesOptions) => ReturnType;
      updateEmbedFiles: (options: Partial<EmbedFilesOptions>) => ReturnType;
    };
  }
}

/**
 * Embed Files extension for TipTap
 * Allows embedding multiple files with download links
 *
 * Paste Handler extension for TipTap
 * Temporarily displays pasted files in the editor before they are uploaded
 * This is a transient node that should not be persisted to database
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
  name: "embedFiles",

  group: "block",

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: EMBED_FILES_CLASSES.WRAPPER,
      },
      backendHost: "",
      user: null,
      setUser: () => {},
    };
  },

  addAttributes() {
    return {
      files: {
        default: [],
        parseHTML: (element) => {
          const filesAttr = element.getAttribute(EMBED_FILES_ATTRIBUTES.FILES);
          if (filesAttr) {
            try {
              return JSON.parse(filesAttr);
            } catch (e) {
              console.error(e);
              return [];
            }
          }
          return [];
        },
        renderHTML: (attributes) => {
          if (!attributes.files || attributes.files.length === 0) {
            return {};
          }
          return {
            [EMBED_FILES_ATTRIBUTES.FILES]: JSON.stringify(attributes.files),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${EMBED_FILES_ATTRIBUTES.CONTAINER}]`,
      },
      {
        tag: `div.${EMBED_FILES_CLASSES.WRAPPER}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { files } = node.attrs;

    if (!files || files.length === 0) {
      return ["div", {}];
    }

    const fileItems = files.map((file: EmbedFileItem) => {
      const relativeUrl = getAttachmentRelativeUrl(file.name);
      return [
        "div",
        {
          class: EMBED_FILES_CLASSES.FILE_ITEM,
        },
        [
          "a",
          {
            href: relativeUrl,
            download: file.name,
            class: EMBED_FILES_CLASSES.FILE_CONTENT,
            title: file.name,
          },
          [
            "span",
            {
              class: EMBED_FILES_CLASSES.FILE_ICON,
            },
            "📄",
          ],
          [
            "span",
            {
              class: EMBED_FILES_CLASSES.FILE_LINK,
            },
            file.name,
          ],
        ],
      ];
    });

    return [
      "div",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        [EMBED_FILES_ATTRIBUTES.CONTAINER]: "true",
        [EMBED_FILES_ATTRIBUTES.FILES]: JSON.stringify(files),
      }),
      [
        "div",
        {
          class: EMBED_FILES_CLASSES.FILES_CONTAINER,
        },
        ...fileItems,
      ],
    ];
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

          const limitedFiles = options.files.slice(0, MAX_FILES_COUNT);

          return commands.insertContent({
            type: this.name,
            attrs: {
              files: limitedFiles,
            },
          });
        },
      updateEmbedFiles:
        (options: Partial<EmbedFilesOptions>): Command =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});

export default EmbedFiles;
