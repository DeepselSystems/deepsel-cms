import useSearchParamState from './useSearchParamState.js';
import React from 'react';

/**
 * Custom hook to manage pagination state via URL search parameters.
 *
 * @param {string} searchQueryKey - The key for the search parameter (e.g., "page").
 * @param {number} initialValue - The initial paging param.
 * @return {[number, (function(newState: number): void)]} - Returns the current paging param and a function to update it.
 *
 * - The paging param is stored in the URL as a search parameter and updated both locally and in the URL.
 * - If the paging param in the URL is invalid or missing, it will default to the `initialValue`.
 */
const usePagingTableParams = (searchQueryKey, initialValue) => {
  // Search params state for paging param
  const [searchParamState, setSearchParamState] = useSearchParamState(searchQueryKey, initialValue);

  // State for page param
  const [state, setState] = React.useState(() => {
    return searchParamState || initialValue;
  });

  /**
   * Updates the current paging param.
   *
   * @param {number} newState - The new paging param to set.
   * - This function updates both the search parameter in the URL and the local state.
   */
  const updateState = React.useCallback(
    (newState) => {
      // Set new search param
      setSearchParamState(newState);

      // Set new local state
      setState(newState);
    },
    [setSearchParamState],
  );

  /**
   * Effect to sync local state with search parameter in the URL.
   * - If the search param is invalid or non-existent, it resets to `initialValue`.
   * - Ensures that the paging param is always a positive integer.
   *
   * Notes:
   * - Be careful when updating state,
   * - Using setstate with inappropriate conditions can lead to infinite loops
   */
  React.useEffect(() => {
    const stateNumber = Number(searchParamState);
    if (isNaN(stateNumber) || stateNumber <= 0) {
      setState(initialValue);
    } else {
      setState(stateNumber);
    }
  }, [initialValue, searchParamState]);

  return [state, updateState];
};

export default usePagingTableParams;
