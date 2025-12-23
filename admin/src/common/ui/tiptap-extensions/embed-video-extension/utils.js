/**
 * Default video dimensions
 */
export const VIDEO_WIDTH_DEFAULT = '100%';
export const VIDEO_HEIGHT_DEFAULT = 'auto';

/**
 * Constants for embed video attributes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_VIDEO_ATTRIBUTES = {
  CONTAINER: 'data-embed-video',
  SRC: 'data-video-src',
  WIDTH: 'data-video-width',
  HEIGHT: 'data-video-height',
};

/**
 * Constants for embed video CSS classes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_VIDEO_CLASSES = {
  WRAPPER: 'embed-video-wrapper',
  VIDEO_CONTAINER: 'embed-video-container',
  VIDEO_CONTENT: 'embed-video-content',
};

/**
 * Check if content contains embed videos
 * @param {HTMLElement} container - Container element to check
 * @returns {boolean} True if embed videos are found
 */
export const containsEmbedVideos = (container) => {
  if (!container) return false;

  return (
    container.querySelector(`[${EMBED_VIDEO_ATTRIBUTES.CONTAINER}]`) !== null ||
    container.querySelector(`.${EMBED_VIDEO_CLASSES.WRAPPER}`) !== null
  );
};

/**
 * Initialize embed videos functionality for a container
 * @param {HTMLElement} container - Container element with embed videos
 */
export const initializeEmbedVideos = (container) => {
  if (!container) return;

  // Find embed videos by both data attribute and class
  const embedVideoWrappers = [
    ...container.querySelectorAll(`[${EMBED_VIDEO_ATTRIBUTES.CONTAINER}]`),
    ...container.querySelectorAll(`.${EMBED_VIDEO_CLASSES.WRAPPER}`),
  ];

  embedVideoWrappers.forEach((wrapper) => {
    // Apply responsive styles to video container
    const videoContainer = wrapper.querySelector(`.${EMBED_VIDEO_CLASSES.VIDEO_CONTAINER}`);

    if (videoContainer) {
      // Ensure video container is responsive
      videoContainer.style.position = 'relative';
      videoContainer.style.width = '100%';
      videoContainer.style.paddingBottom = '56.25%'; // 16:9 aspect ratio

      const video = videoContainer.querySelector('video');
      if (video) {
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
      }
    }
  });
};
