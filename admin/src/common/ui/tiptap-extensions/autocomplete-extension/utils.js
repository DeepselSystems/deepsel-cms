import { AUTOCOMPLETE_CONSTANTS } from './constants.js';

/**
 * Check if the current sentence is incomplete
 * @param {string} text - Full text content
 * @param {number} position - Cursor position
 * @returns {boolean} - True if sentence is incomplete
 */
export function isIncompleteSentence(text, position) {
  // Get text before cursor
  const textBefore = text.slice(0, position);

  // Check if sentence ends with punctuation followed by space or end
  if (textBefore.match(/[.!?]\s*$/)) {
    return false; // Sentence is complete
  }

  // Split text into sentences by common delimiters
  const sentences = textBefore.split(/[.!?]+/);
  const lastSentence = sentences[sentences.length - 1].trim();

  // Check if the last sentence fragment is substantial enough (more than 3 characters)
  return lastSentence.length > AUTOCOMPLETE_CONSTANTS.MIN_TEXT_LENGTH;
}

/**
 * Create the CSS for ghost text styling
 * @returns {string} - CSS string
 */
export function createGhostTextCSS() {
  return `
    .${AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.CONTAINER} {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      opacity: 0.7;
      pointer-events: none;
      user-select: none;
      font-style: italic;
      color: #52525b;
    }

    .${AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.GHOST_TEXT} {
      opacity: 0.45;
      pointer-events: none;
      user-select: none;
      color: #666;
      white-space: pre-wrap;
    }
    
    .${AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.TAB_BADGE} {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75em;
      letter-spacing: 0.02em;
      pointer-events: none;
      user-select: none;
      color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.12);
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid #ddd;
      font-family: monospace;
      white-space: nowrap;
      text-transform: uppercase;
      font-weight: 600;
    }
  `;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Debounce function for non-hook usage
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if a key matches one of our autocomplete keys
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} - True if key is relevant
 */
export function isRelevantKey(event) {
  return [AUTOCOMPLETE_CONSTANTS.KEYS.TAB, AUTOCOMPLETE_CONSTANTS.KEYS.ESCAPE].includes(event.key);
}
