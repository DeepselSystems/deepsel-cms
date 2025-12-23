/**
 * YouTube expression string
 */
export const YOUTUBE_REG_EXP = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;

/**
 * Constants for YouTube jump marks data attributes
 *
 * BE CAREFUL TO EDIT THIS - IT EFFECTS OLDER DATA
 */
export const YOUTUBE_JUMP_MARKS_ATTRIBUTES = {
  CONTAINER: 'data-youtube-jump-marks',
  JUMP_MARKS: 'data-jump-marks',
  SHOW_JUMP_MARKS: 'data-show-jump-marks',
  VIDEO_ID: 'data-video-id',
  TIME: 'data-time',
  TITLE: 'data-video-title',
};

/**
 * Constants for YouTube jump marks CSS classes
 *
 * BE CAREFUL TO EDIT THIS - IT EFFECTS OLDER DATA
 */
export const YOUTUBE_JUMP_MARKS_CLASSES = {
  JUMP_MARK_ITEM: 'jump-mark-item',
};

/**
 * Extract YouTube video ID from URL
 *
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID
 */
export const getVideoId = (url) => {
  if (!url) return null;

  const match = url.match(YOUTUBE_REG_EXP);

  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * YouTube Jump Marks utility functions for website rendering
 * Provides functionality to handle jump mark clicks on the frontend
 */

/**
 * Inject handleJumpMarkClick function into global scope if not already present
 * This function handles clicking on jump marks to seek to specific times in YouTube videos
 */
export const injectYouTubeJumpMarkHandler = () => {
  if (typeof window !== 'undefined' && !window.handleJumpMarkClick) {
    /**
     * Handle jump mark click to seek to specific time in YouTube video
     * @param {HTMLElement} element - The clicked jump mark element
     * @param {string} videoId - YouTube video ID
     * @param {number} time - Time in seconds to jump to
     */
    window.handleJumpMarkClick = (element, videoId, time) => {
      const container = element.closest(`[${YOUTUBE_JUMP_MARKS_ATTRIBUTES.CONTAINER}]`);
      if (!container) return;

      const iframe = container.querySelector('iframe');
      if (!iframe) return;

      // Update iframe src with time parameter
      const currentSrc = iframe.src;
      const baseUrl = currentSrc.split('?')[0];
      iframe.src = `${baseUrl}?start=${time}&autoplay=1`;

      // Visual feedback - remove active state from all items
      const allItems = container.querySelectorAll(`.${YOUTUBE_JUMP_MARKS_CLASSES.JUMP_MARK_ITEM}`);
      allItems.forEach((item) => item.classList.remove('bg-blue-100'));

      // Add active state to clicked item
      element.classList.add('bg-blue-100');
    };
  }
};

/**
 * Check if content contains YouTube jump marks
 * @param {string} htmlContent - HTML content to check
 * @returns {boolean} True if content contains YouTube jump marks
 */
export const containsYouTubeJumpMarks = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return false;
  }

  return htmlContent.includes(`${YOUTUBE_JUMP_MARKS_ATTRIBUTES.CONTAINER}="true"`);
};

/**
 * Initialize YouTube jump marks functionality for a container
 * @param {HTMLElement} container - Container element to initialize
 */
export const initializeYouTubeJumpMarks = (container) => {
  if (!container) return;

  // Inject the handler function
  injectYouTubeJumpMarkHandler();

  // Find all jump mark items and ensure they have proper click handlers
  const jumpMarkItems = container.querySelectorAll(
    `.${YOUTUBE_JUMP_MARKS_CLASSES.JUMP_MARK_ITEM}[${YOUTUBE_JUMP_MARKS_ATTRIBUTES.TIME}]`,
  );

  jumpMarkItems.forEach((item) => {
    // If onclick attribute is missing, add it
    if (!item.getAttribute('onclick')) {
      const time = item.getAttribute(YOUTUBE_JUMP_MARKS_ATTRIBUTES.TIME);
      const videoContainer = item.closest(`[${YOUTUBE_JUMP_MARKS_ATTRIBUTES.CONTAINER}]`);

      if (time && videoContainer) {
        const iframe = videoContainer.querySelector('iframe');
        if (iframe) {
          // Extract video ID from iframe src
          const src = iframe.getAttribute('src');
          const videoIdMatch = src.match(/\/embed\/([^?]+)/);
          const videoId = videoIdMatch ? videoIdMatch[1] : '';

          if (videoId) {
            item.setAttribute('onclick', `handleJumpMarkClick(this, '${videoId}', ${time})`);
          }
        }
      }
    }
  });
};
