import { Node } from '@tiptap/core';
import type { Command } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GalleryNodeView from './components/GalleryNodeView';

/** Gallery layout configuration */
export interface GalleryConfig {
  imagesPerRow: number;
  gap: number;
  maxWidth: number | null;
  rounded: boolean;
}

/** Single attachment entry inside a gallery */
export interface GalleryAttachment {
  name: string;
  alt_text?: string;
  caption?: string;
}

interface GalleryNodeAttributes {
  galleryId: string | null;
  config: GalleryConfig;
  attachments: GalleryAttachment[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gallery: {
      setGallery: (attributes: Partial<GalleryNodeAttributes>) => ReturnType;
      updateGallery: (attributes: Partial<GalleryNodeAttributes>) => ReturnType;
    };
  }
}

export interface GalleryOptions {
  backendHost?: string;
}

/** Default gallery layout config */
const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  imagesPerRow: 3,
  gap: 4,
  maxWidth: null,
  rounded: true,
};

/** data-type attribute value identifying gallery wrapper divs */
const GALLERY_DATA_TYPE = 'gallery';

/**
 * Gallery extension for TipTap.
 * Stores gallery as Jinja syntax: {{ gallery('id', 'configJSON', 'attachmentsJSON') }}
 * Parses back both old data-* format (backward compat) and new Jinja format.
 */
export const Gallery = Node.create<GalleryOptions>({
  name: 'gallery',

  group: 'block',
  content: '',
  marks: '',
  selectable: true,
  draggable: true,
  isolating: true,
  atom: true,

  addOptions() {
    return {
      backendHost: undefined,
    };
  },

  addAttributes() {
    return {
      galleryId: { default: null },
      config: { default: DEFAULT_GALLERY_CONFIG },
      attachments: { default: [] },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${GALLERY_DATA_TYPE}"]`,
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return {};

          const text = node.textContent?.trim() || '';

          // New Jinja format: {{ gallery('id', 'configJSON', 'attachmentsJSON') }}
          const jinjaMatch = text.match(
            /^\{\{\s*gallery\('([^']*)',\s*'([\s\S]*?)',\s*'([\s\S]*?)'\s*\)\s*\}\}$/,
          );
          if (jinjaMatch) {
            try {
              return {
                galleryId: jinjaMatch[1] || null,
                config: JSON.parse(jinjaMatch[2]),
                attachments: JSON.parse(jinjaMatch[3]),
              };
            } catch {
              return false;
            }
          }

          // Backward compat: old data-* attribute format
          try {
            const configStr = node.getAttribute('data-config');
            const attachmentsStr = node.getAttribute('data-attachments');
            return {
              galleryId: node.getAttribute('data-gallery-id') || null,
              config: configStr ? (JSON.parse(configStr) as GalleryConfig) : DEFAULT_GALLERY_CONFIG,
              attachments: attachmentsStr ? (JSON.parse(attachmentsStr) as GalleryAttachment[]) : [],
            };
          } catch {
            return {};
          }
        },
      },
    ];
  },

  renderHTML({ node }) {
    const config = (node.attrs.config as GalleryConfig) || DEFAULT_GALLERY_CONFIG;
    const attachments = (node.attrs.attachments as GalleryAttachment[]) || [];
    const galleryId = (node.attrs.galleryId as string) || '';

    const configStr = JSON.stringify(config);
    const attachmentsStr = JSON.stringify(
      attachments.map((a) => ({
        name: a.name,
        alt_text: a.alt_text || '',
        caption: a.caption || '',
      })),
    );

    return [
      'div',
      { 'data-type': GALLERY_DATA_TYPE },
      `{{ gallery('${galleryId}', '${configStr}', '${attachmentsStr}') }}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryNodeView);
  },

  addCommands() {
    return {
      setGallery:
        (attributes: Partial<GalleryNodeAttributes>): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateGallery:
        (attributes: Partial<GalleryNodeAttributes>): Command =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.updateAttributes(this.name, attributes);
          }
          return false;
        },
    };
  },
});

export default Gallery;
