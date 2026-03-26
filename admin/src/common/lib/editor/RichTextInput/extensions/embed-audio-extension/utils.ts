/**
 * Default audio dimensions
 */
export const AUDIO_WIDTH_DEFAULT = 600;

/**
 * Constants for embed audio attributes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_AUDIO_ATTRIBUTES = {
  CONTAINER: 'data-embed-audio',
  SRC: 'data-audio-src',
  WIDTH: 'data-audio-width',
} as const;

/**
 * Constants for embed audio CSS classes
 * BE CAREFUL TO EDIT THIS - IT AFFECTS OLDER DATA
 */
export const EMBED_AUDIO_CLASSES = {
  WRAPPER: 'embed-audio-wrapper',
  AUDIO_CONTAINER: 'embed-audio-container',
  AUDIO_CONTENT: 'embed-audio-content',
} as const;

/**
 * Check if content contains embed audios
 * @param {HTMLElement} container - Container element to check
 * @returns {boolean} True if embed audios are found
 */
export const containsEmbedAudios = (container: HTMLElement | null): boolean => {
  if (!container) return false;

  return (
    container.querySelector(`[${EMBED_AUDIO_ATTRIBUTES.CONTAINER}]`) !== null ||
    container.querySelector(`.${EMBED_AUDIO_CLASSES.WRAPPER}`) !== null
  );
};

/**
 * Initialize embed audios functionality for a container
 * @param {HTMLElement} container - Container element with embed audios
 */
export const initializeEmbedAudios = (container: HTMLElement | null): void => {
  if (!container) return;

  const embedAudioWrappers = [
    ...Array.from(container.querySelectorAll(`[${EMBED_AUDIO_ATTRIBUTES.CONTAINER}]`)),
    ...Array.from(container.querySelectorAll(`.${EMBED_AUDIO_CLASSES.WRAPPER}`)),
  ];

  embedAudioWrappers.forEach((wrapper) => {
    const audioContainer = wrapper.querySelector(`.${EMBED_AUDIO_CLASSES.AUDIO_CONTAINER}`);

    if (audioContainer && audioContainer instanceof HTMLElement) {
      audioContainer.style.width = '100%';

      const audio = audioContainer.querySelector('audio');
      if (audio && audio instanceof HTMLAudioElement) {
        audio.style.width = '100%';
      }
    }
  });
};
