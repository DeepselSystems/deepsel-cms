/**
 * Embed mode values — determines how file references are stored in the editor output.
 * LEGACY: stores direct relative URLs (original behavior).
 * JINJA: stores {{ attachment('name') }} template syntax for server-side locale resolution.
 */
export const EMBED_MODE = {
  LEGACY: 'legacy',
  JINJA: 'jinja',
};

/** Derived union type from EMBED_MODE values */
export type EmbedMode = (typeof EMBED_MODE)[keyof typeof EMBED_MODE];

/**
 * Embed file item interface (legacy mode)
 */
export interface EmbedFileItem {
  url: string;
  name: string;
}

/**
 * Embed file item interface for jinja mode.
 * Stored as {{ attachment('attachmentName') }} in the rendered HTML.
 */
export interface JinjaFileItem {
  /** Matches the attachment.name column — used inside {{ attachment('...') }} */
  attachmentName: string;
  /** Human-readable label displayed in the editor */
  displayName: string;
}

/**
 * Embed files data interface
 */
export interface EmbedFilesData {
  files: EmbedFileItem[];
}
