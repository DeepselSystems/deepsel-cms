import { EMBED_MODE } from './types';
import type { EmbedMode } from './types';

/**
 * Maximum number of files allowed
 */
export const MAX_FILES_COUNT = 10;

/**
 * Default embed mode applied when inserting new file blocks.
 * JINJA is the new default — produces {{ attachment('name') }} syntax for locale-aware rendering.
 */
export const DEFAULT_EMBED_MODE: EmbedMode = EMBED_MODE.JINJA;

/**
 * Constants for embed files attributes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_FILES_ATTRIBUTES = {
  CONTAINER: 'data-embed-files',
  /** Legacy mode: JSON array of { url, name } */
  FILES: 'data-files',
  /** Discriminator: 'legacy' | 'jinja' */
  MODE: 'data-embed-mode',
  /** Jinja mode: JSON array of { attachmentName, displayName } */
  JINJA_FILES: 'data-jinja-files',
} as const;

/**
 * Constants for embed files CSS classes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_FILES_CLASSES = {
  WRAPPER: 'embed-files-wrapper',
  FILES_CONTAINER: 'embed-files-container',
  FILE_ITEM: 'embed-file-item',
  FILE_CONTENT: 'embed-file-content',
  FILE_ICON: 'embed-file-icon',
  FILE_LINK: 'embed-file-link',
} as const;

/**
 * Formats an attachment name into Jinja2 template syntax.
 * The backend resolves this to a locale-appropriate <a> or <img> tag at render time.
 * @param attachmentName - The attachment.name column value (e.g. "hero-banner")
 * @returns Jinja2 syntax string e.g. "{{ attachment('hero-banner') }}"
 */
export const formatJinjaSyntax = (attachmentName: string): string =>
  `{{ attachment('${attachmentName}') }}`;

/**
 * Get short URL from full URL (extract filename)
 * @param {string} url - Full URL
 * @returns {string} Short URL (filename only)
 */
export const getShortUrl = (url: string): string => {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1];
};

/**
 * Check if content contains embed files
 * @param {HTMLElement} container - Container element to check
 * @returns {boolean} True if embed files are found
 */
export const containsEmbedFiles = (container: HTMLElement | null): boolean => {
  if (!container) return false;

  return (
    container.querySelector(`[${EMBED_FILES_ATTRIBUTES.CONTAINER}]`) !== null ||
    container.querySelector(`.${EMBED_FILES_CLASSES.WRAPPER}`) !== null
  );
};

/**
 * Initialize embed files functionality for a container
 * @param {HTMLElement} container - Container element with embed files
 */
export const initializeEmbedFiles = (container: HTMLElement | null): void => {
  if (!container) return;

  const embedFilesWrappers = [
    ...Array.from(container.querySelectorAll(`[${EMBED_FILES_ATTRIBUTES.CONTAINER}]`)),
    ...Array.from(container.querySelectorAll(`.${EMBED_FILES_CLASSES.WRAPPER}`)),
  ];

  embedFilesWrappers.forEach((wrapper) => {
    const filesContainer = wrapper.querySelector(`.${EMBED_FILES_CLASSES.FILES_CONTAINER}`);

    if (filesContainer && filesContainer instanceof HTMLElement) {
      filesContainer.style.width = '100%';
    }
  });
};
