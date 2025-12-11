import {useState, useCallback, useRef, useEffect} from 'react';
import {useDebounce} from './useDebounce.js';
import {AUTOCOMPLETE_CONSTANTS} from '../constants.js';
import {isIncompleteSentence} from '../utils.js';

/**
 * Custom hook for managing autocomplete functionality
 * @param {Object} config - Configuration object
 * @param {string} config.backendHost - Backend host URL
 * @param {string} config.token - Authentication token
 * @param {Function} config.onSuggestionUpdate - Callback when suggestion updates
 * @returns {Object} - Autocomplete state and functions
 */
export function useAutocomplete({backendHost, token, onSuggestionUpdate}) {
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  const {debouncedCallback, cancel} = useDebounce(async (text, position) => {
    await fetchSuggestion(text, position);
  }, AUTOCOMPLETE_CONSTANTS.DEBOUNCE_DELAY);

  /**
   * Fetch AI suggestion from API
   * @param {string} text - Current text content
   * @param {number} position - Cursor position
   */
  const fetchSuggestion = useCallback(
    async (text, position) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Check if current sentence is incomplete
      if (!isIncompleteSentence(text, position)) {
        setSuggestion('');
        onSuggestionUpdate?.('');
        return;
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);

        const response = await fetch(
          `${backendHost}${AUTOCOMPLETE_CONSTANTS.API_ENDPOINT}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text,
              cursor_position: position,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const newSuggestion = data.completion || data.suggestions?.[0] || '';

        setSuggestion(newSuggestion);
        onSuggestionUpdate?.(newSuggestion);
      } catch (error) {
        // Don't log error if it's an abort
        if (error.name !== 'AbortError') {
          console.error('Error fetching autocomplete suggestions:', error);
        }

        setSuggestion('');
        onSuggestionUpdate?.('');
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [backendHost, token, onSuggestionUpdate]
  );

  /**
   * Trigger autocomplete check
   * @param {string} text - Current text content
   * @param {number} position - Cursor position
   */
  const triggerAutocomplete = useCallback(
    (text, position) => {
      debouncedCallback(text, position);
    },
    [debouncedCallback]
  );

  /**
   * Accept the current suggestion
   * @returns {string} - The accepted suggestion
   */
  const acceptSuggestion = useCallback(() => {
    const currentSuggestion = suggestion;
    setSuggestion('');
    onSuggestionUpdate?.('');
    return currentSuggestion;
  }, [suggestion, onSuggestionUpdate]);

  /**
   * Dismiss the current suggestion
   */
  const dismissSuggestion = useCallback(() => {
    setSuggestion('');
    onSuggestionUpdate?.('');

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Cancel debounced callback
    cancel();
  }, [onSuggestionUpdate, cancel]);

  /**
   * Cancel any pending requests and debounced callbacks
   */
  const cancelAll = useCallback(() => {
    dismissSuggestion();
  }, [dismissSuggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Cancel debounced callback
      cancel();
    };
  }, [cancel]);

  return {
    suggestion,
    isLoading,
    triggerAutocomplete,
    acceptSuggestion,
    dismissSuggestion,
    cancelAll,
  };
}
