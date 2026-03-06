export * from './cookieUtils';
export * from './isObjectOrArray';

/**
 * Builds the full URL for an attachment file
 * @param backendHost - The backend host URL (e.g. "https://api.example.com")
 * @param name - The attachment filename
 * @returns Full URL to serve the attachment, or empty string if name is falsy
 */
export function getAttachmentUrl(backendHost: string, name: string): string {
  return name ? `${backendHost}/attachment/serve/${name}` : '';
}

/**
 * Builds the relative URL for an attachment file (no host)
 * @param name - The attachment filename
 * @returns Relative URL to serve the attachment, or empty string if name is falsy
 */
export function getAttachmentRelativeUrl(name: string): string {
  return name ? `/attachment/serve/${name}` : '';
}

/**
 * Extracts the filename from an attachment serve URL
 * @param url - The attachment URL (e.g. "https://api.example.com/attachment/serve/file.png")
 * @returns The filename portion of the URL, or empty string if url is falsy
 */
export function getFileNameFromAttachUrl(url: string): string {
  return url?.substring(url.lastIndexOf('/') + 1) || '';
}

/**
 * Triggers a browser download for a file from an attachment URL
 * @param url - The attachment URL to download from
 */
export function downloadFromAttachUrl(url: string): void {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', getFileNameFromAttachUrl(url));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    })
    .catch((error) => {
      console.error('Error downloading the file:', error);
    });
}

/**
 * Extracts the file extension from a filename or URL
 * @param fileName - The filename or path (e.g. "photo.jpg", "/path/to/file.pdf")
 * @returns The extension without the dot (e.g. "jpg"), or empty string if none
 */
export function getFileExtension(fileName: string): string {
  return fileName?.split('.').pop() ?? '';
}

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};
