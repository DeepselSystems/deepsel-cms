/**
 * Enhanced Autocomplete Extension for Tiptap
 *
 * Features:
 * - Tab to accept suggestion at once (not character by character)
 * - Shows "Tab" badge at end of ghost text
 * - Cancel pending API requests on every keystroke
 * - Uses 1000ms debounce
 * - Integrates with existing API endpoint
 */

export { default as AutocompleteExtension } from './AutocompleteExtension.js';
export { useAutocomplete } from './hooks/useAutocomplete.js';
export { useDebounce } from './hooks/useDebounce.js';
export { default as TabBadge } from './components/TabBadge.jsx';
export { AUTOCOMPLETE_CONSTANTS } from './constants.js';
export {
  isIncompleteSentence,
  createGhostTextCSS,
  escapeHTML,
  debounce as utilDebounce,
  isRelevantKey,
} from './utils.js';

// Default export for convenience
export { default } from './AutocompleteExtension.js';
