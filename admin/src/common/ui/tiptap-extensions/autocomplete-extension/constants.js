/**
 * Constants for the AutocompleteExtension
 */

export const AUTOCOMPLETE_CONSTANTS = {
  // Debounce delay in milliseconds
  DEBOUNCE_DELAY: 2000,

  // Minimum text length before triggering autocomplete
  MIN_TEXT_LENGTH: 3,

  // CSS class names
  CSS_CLASSES: {
    GHOST_TEXT: 'autocomplete-ghost-text',
    TAB_BADGE: 'autocomplete-tab-badge',
    CONTAINER: 'autocomplete-container',
  },

  // Tab badge text
  TAB_BADGE_TEXT: '⇥ Tab',

  // API endpoint
  API_ENDPOINT: '/autocomplete/suggest',

  // Keyboard keys
  KEYS: {
    TAB: 'Tab',
    ESCAPE: 'Escape',
  },

  // Events
  EVENTS: {
    DISMISS: 'ai-dismiss',
    SUGGESTION_UPDATE: 'suggestion-update',
  },
};
