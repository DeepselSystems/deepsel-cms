import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import {AUTOCOMPLETE_CONSTANTS} from './constants.js';
import {
  createGhostTextCSS,
  isIncompleteSentence,
  isRelevantKey,
} from './utils.js';

/**
 * Custom Tiptap extension for AI-powered autocomplete with Tab functionality
 * Features:
 * - 1000ms debounce for API calls
 * - Cancel pending requests on every keystroke
 * - Tab key accepts entire suggestion at once
 * - Shows "Tab" badge at end of ghost text
 */
export const AutocompleteExtension = Extension.create({
  name: 'autocomplete',

  addOptions() {
    return {
      fetchAutocompletion: null, // Function to fetch suggestions
      backendHost: '',
      token: '',
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const {fetchAutocompletion, backendHost, token, enabled} = this.options;

    if (!enabled || (!fetchAutocompletion && (!backendHost || !token))) {
      return [];
    }

    // Add CSS to head
    if (typeof document !== 'undefined') {
      const styleId = 'autocomplete-extension-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = createGhostTextCSS();
        document.head.appendChild(style);
      }
    }

    const pluginKey = new PluginKey('autocomplete');

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init() {
            return {
              suggestion: '',
              isLoading: false,
              abortController: null,
              debounceTimer: null,
              hasFocus: true, // Start with true to show suggestions initially
              view: null, // Store view reference
            };
          },

          apply(transaction, oldState, _oldEditorState, _newEditorState) {
            const newState = {...oldState};
            const suggestionUpdate = transaction.getMeta(
              'autocomplete-suggestion-update'
            );

            // Clear suggestion on any content change
            if (transaction.docChanged) {
              newState.suggestion = '';
              newState.abortController?.abort();
              newState.abortController = null;
              newState.isLoading = false;

              // Clear existing debounce timer
              if (newState.debounceTimer) {
                clearTimeout(newState.debounceTimer);
                newState.debounceTimer = null;
              }

              // Schedule new autocomplete check
              if (enabled && (fetchAutocompletion || (backendHost && token))) {
                newState.debounceTimer = setTimeout(() => {
                  const view = extension?.editor?.view;
                  if (!view) {
                    return;
                  }

                  checkForSuggestion(
                    view,
                    pluginKey,
                    fetchAutocompletion,
                    backendHost,
                    token
                  );
                }, AUTOCOMPLETE_CONSTANTS.DEBOUNCE_DELAY);

                if (newState.debounceTimer) {
                  newState.isLoading = true;
                }
              }
            }

            if (
              transaction.selectionSet &&
              !transaction.docChanged &&
              !transaction.getMeta('autocomplete-suggestion-update')
            ) {
              newState.suggestion = '';
              newState.abortController?.abort();
              newState.abortController = null;
              newState.isLoading = false;
              if (newState.debounceTimer) {
                clearTimeout(newState.debounceTimer);
                newState.debounceTimer = null;
              }
            }

            if (suggestionUpdate) {
              return {
                ...newState,
                ...suggestionUpdate,
              };
            }

            return newState;
          },
        },

        props: {
          handleKeyDown(view, event) {
            const pluginState = pluginKey.getState(view.state);

            if (!isRelevantKey(event)) {
              return false;
            }

            // Tab key - accept suggestion
            if (
              event.key === AUTOCOMPLETE_CONSTANTS.KEYS.TAB &&
              pluginState.suggestion
            ) {
              event.preventDefault();

              const {state, dispatch} = view;
              const {from} = state.selection;

              // Create a single transaction to insert text and clear suggestion
              const tr = state.tr
                .insertText(pluginState.suggestion, from, from)
                .setMeta('autocomplete-suggestion-update', {
                  ...pluginState,
                  suggestion: '',
                });

              dispatch(tr);
              return true;
            }

            // Escape key - dismiss suggestion
            if (
              event.key === AUTOCOMPLETE_CONSTANTS.KEYS.ESCAPE &&
              pluginState.suggestion
            ) {
              event.preventDefault();

              const {state, dispatch} = view;

              // Cancel any pending request
              pluginState.abortController?.abort();
              pluginState.abortController = null;

              // Clear debounce timer
              if (pluginState.debounceTimer) {
                clearTimeout(pluginState.debounceTimer);
                pluginState.debounceTimer = null;
              }

              // Clear suggestion and trigger repaint
              const newPluginState = {...pluginState, suggestion: ''};
              const tr = state.tr.setMeta(
                'autocomplete-suggestion-update',
                newPluginState
              );
              tr.setMeta(AUTOCOMPLETE_CONSTANTS.EVENTS.DISMISS, true);
              dispatch(tr);

              return true;
            }

            return false;
          },

          decorations(state) {
            const pluginState = pluginKey.getState(state);

            if (!pluginState.suggestion || typeof document === 'undefined') {
              return null;
            }

            // Don't show suggestions if editor doesn't have focus
            if (pluginState.view && !pluginState.view.hasFocus()) {
              return null;
            }

            const {from} = state.selection;

            // Create a widget decoration for ghost text
            const container = document.createElement('span');
            container.className = AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.CONTAINER;
            container.style.pointerEvents = 'none';
            container.style.userSelect = 'none';

            const suggestionSpan = document.createElement('span');
            suggestionSpan.className =
              AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.GHOST_TEXT;
            suggestionSpan.textContent = pluginState.suggestion;

            const badge = document.createElement('span');
            badge.className = AUTOCOMPLETE_CONSTANTS.CSS_CLASSES.TAB_BADGE;
            badge.textContent = AUTOCOMPLETE_CONSTANTS.TAB_BADGE_TEXT;

            container.appendChild(suggestionSpan);
            container.appendChild(badge);

            const decorations = DecorationSet.create(state.doc, [
              Decoration.widget(from, container),
            ]);

            return decorations;
          },
        },

        view(editorView) {
          // Store view reference in plugin state
          const pluginState = pluginKey.getState(editorView.state);
          if (pluginState && !pluginState.view) {
            editorView.dispatch(
              editorView.state.tr.setMeta('autocomplete-suggestion-update', {
                view: editorView,
              })
            );
          }

          // Add document-level focus/blur listeners for better detection
          const handleFocusOut = (event) => {
            // Check if focus is moving outside the editor
            if (
              !event.relatedTarget ||
              !editorView.dom.contains(event.relatedTarget)
            ) {
              const currentPluginState = pluginKey.getState(editorView.state);
              if (currentPluginState) {
                // Cancel any pending request
                currentPluginState.abortController?.abort();
                currentPluginState.abortController = null;

                // Clear debounce timer
                if (currentPluginState.debounceTimer) {
                  clearTimeout(currentPluginState.debounceTimer);
                  currentPluginState.debounceTimer = null;
                }

                // Clear suggestion and loading state
                const {state, dispatch} = editorView;
                const tr = state.tr.setMeta('autocomplete-suggestion-update', {
                  ...currentPluginState,
                  hasFocus: false,
                  suggestion: '',
                  isLoading: false,
                  abortController: null,
                });
                dispatch(tr);
              }
            }
          };

          const handleFocusIn = (event) => {
            // Only handle if focus is coming into the editor
            if (editorView.dom.contains(event.target)) {
              const currentPluginState = pluginKey.getState(editorView.state);
              if (currentPluginState) {
                const {state, dispatch} = editorView;
                const tr = state.tr.setMeta('autocomplete-suggestion-update', {
                  ...currentPluginState,
                  hasFocus: true,
                });
                dispatch(tr);
              }
            }
          };

          // Add event listeners to the editor DOM
          editorView.dom.addEventListener('focusout', handleFocusOut);
          editorView.dom.addEventListener('focusin', handleFocusIn);

          return {
            update: (view, prevState) => {
              const prevPluginState = pluginKey.getState(prevState);
              const currentPluginState = pluginKey.getState(view.state);

              if (
                prevPluginState?.suggestion !== currentPluginState?.suggestion
              ) {
                // Trigger re-render to apply updated decorations immediately
                if (typeof view.updateState === 'function') {
                  view.updateState(view.state);
                }
              }
            },

            destroy: () => {
              // Remove event listeners
              editorView.dom.removeEventListener('focusout', handleFocusOut);
              editorView.dom.removeEventListener('focusin', handleFocusIn);

              // Cleanup any pending requests
              const pluginState = pluginKey.getState(editorView.state);
              if (pluginState?.abortController) {
                pluginState.abortController.abort();
                pluginState.abortController = null;
              }

              if (pluginState?.debounceTimer) {
                clearTimeout(pluginState.debounceTimer);
              }
            },
          };
        },
      }),
    ];
  },
});

/**
 * Check for and fetch autocomplete suggestions
 */
async function checkForSuggestion(
  view,
  pluginKey,
  fetchAutocompletion,
  backendHost,
  token
) {
  const {state} = view;
  const pluginState = pluginKey.getState(state);

  if (!pluginState) {
    return;
  }

  // Timer has fired; clear stored reference
  pluginState.debounceTimer = null;

  // Cancel any existing request
  if (pluginState.abortController) {
    pluginState.abortController.abort();
  }

  // Create new abort controller
  const abortController = new AbortController();
  pluginState.abortController = abortController;

  // Mark loading state
  view.dispatch(
    state.tr.setMeta('autocomplete-suggestion-update', {
      isLoading: true,
      abortController,
    })
  );

  try {
    const text = state.doc.textBetween(0, state.doc.content.size, '\n');
    const position = state.selection.from;

    if (text.trim().length < AUTOCOMPLETE_CONSTANTS.MIN_TEXT_LENGTH) {
      view.dispatch(
        state.tr.setMeta('autocomplete-suggestion-update', {
          suggestion: '',
          isLoading: false,
          abortController: null,
        })
      );
      return;
    }

    if (!isIncompleteSentence(text, position)) {
      view.dispatch(
        state.tr.setMeta('autocomplete-suggestion-update', {
          suggestion: '',
          isLoading: false,
          abortController: null,
        })
      );
      return;
    }

    let suggestion = '';

    // Use custom fetch function if provided
    if (fetchAutocompletion) {
      suggestion = await fetchAutocompletion(text, position);
    } else {
      // Use default API call
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
          signal: abortController.signal,
        }
      );

      if (response.ok) {
        const data = await response.json();
        suggestion = data.completion || data.suggestions?.[0] || '';
      }
    }

    view.dispatch(
      state.tr.setMeta('autocomplete-suggestion-update', {
        suggestion: suggestion || '',
        isLoading: false,
        abortController: null,
      })
    );
  } catch (error) {
    // Don't log error if it's an abort
    if (error.name !== 'AbortError') {
      console.error('Error fetching autocomplete suggestion:', error);
    }
    view.dispatch(
      state.tr.setMeta('autocomplete-suggestion-update', {
        suggestion: '',
        isLoading: false,
        abortController: null,
      })
    );
  } finally {
    if (pluginState.abortController === abortController) {
      pluginState.abortController = null;
    }
  }
}

export default AutocompleteExtension;
