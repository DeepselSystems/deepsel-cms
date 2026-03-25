/**
 * Embed file item interface
 */
export interface EmbedFileItem {
  url: string;
  name: string;
}

/**
 * Embed files data interface
 */
export interface EmbedFilesData {
  files: EmbedFileItem[];
}
