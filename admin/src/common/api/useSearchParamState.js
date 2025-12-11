import React from 'react';
import {useSearchParams} from 'react-router-dom';
import isObjectOrArray from '../utils/isObjectOrArray.js';

/**
 * Those are the empty types of URL search param
 *
 * @type {string[]}
 */
const SearchParamEmptyTypes = ['', null, undefined];

/**
 * Parses a string value and attempts to convert it to its original type (number or boolean) based on the provided initial type.
 * If the conversion fails, the original string value is returned, and a warning is logged in the console.
 *
 * @param {string} value - The string value to be parsed and converted.
 * @param {string} initialType - The original type of the value before it was stringified ('number' or 'boolean').
 * @return {number|boolean|string} - Returns the value converted to a number, boolean, or the original string if conversion fails.
 *
 * Example:
 * parseValue("123", "number"); // returns 123 (number)
 * parseValue("true", "boolean"); // returns true (boolean)
 * parseValue("abc", "number"); // logs a warning and returns "abc"
 */
const convertToOriginalType = (value, initialType) => {
  // Check and return if the value is empty
  const isEmpty = SearchParamEmptyTypes.includes(value);
  if (isEmpty) {
    return '';
  }

  // Warning function
  const printWarning = () => {
    console.warn(
      `Cannot be converted to original value type. Initial type: ${initialType}, value to convert: ${value}, of type: ${typeof value}`
    );
  };

  // Checking and converting
  switch (initialType) {
    case 'number': {
      const valueNumber = Number(value);
      if (isNaN(valueNumber)) {
        printWarning();
        return value;
      }
      return valueNumber;
    }
    case 'boolean': {
      const valueBool = String(value).toLowerCase();
      if ([String(true), String(false)].includes(valueBool)) {
        return valueBool === 'true';
      }
      printWarning();
      return value;
    }
    case 'object':
      try {
        // if string, parse it
        if (typeof value === 'string') {
          // Check if the string is empty
          if (value.trim() === '') {
            return '';
          }
          // Parse the JSON string
          return JSON.parse(value);
        } else {
          // If it's already an object, return it as is
          return value;
        }
      } catch (e) {
        printWarning();
        return value;
      }
    default:
      return value;
  }
};

/**
 * Custom React hook to synchronize a state value with a URL search parameter.
 * This hook ensures that changes to the URL's search parameters are reflected in the component's state,
 * and updates to the state are reflected in the URL search parameters.
 *
 * @param {string} searchQueryKey - The key of the URL search parameter to sync with the state.
 * @param {*} initialValue - The initial value of the state. It determines the type (number, boolean, string, etc.) of the state.
 * @return {[*, (newState: *) => void]} - A tuple containing the current state and a function to update the state.
 *
 * Example usage:
 *
 * const [name, setName] = useSearchParamState('name', 'John Doe');
 *
 * - `name`: current value of the 'name' URL search param or 'John Doe' (initial value).
 * - `setName`: function to update both the 'name' URL search param and the component state.
 *
 * Notes:
 * - If the search parameter already exists in the URL, its value will be used to initialize the state.
 * - If the search parameter does not exist, the `initialValue` will be used.
 * - The hook watches for URL search parameter changes and updates the component's state accordingly.
 * - Updates to the state will modify the URL's search parameter.
 */
const useSearchParamState = (searchQueryKey, initialValue) => {
  // Detect the type of initial value
  const initialType = isObjectOrArray(initialValue)
    ? 'object'
    : typeof initialValue;

  // Search params
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state with parsed value from URL or initial value
  const [state, setState] = React.useState(() => {
    const paramValue = searchParams.get(searchQueryKey);
    return SearchParamEmptyTypes.includes(paramValue)
      ? initialValue
      : convertToOriginalType(paramValue, initialType);
  });

  /**
   * Function to set state and update URL
   *
   * @type {(newState: *) => void}
   */
  const updateState = React.useCallback(
    (newState) => {
      // Create a copy of search params
      const newSearchParams = new URLSearchParams(searchParams);

      // Update the param in URL
      const newStateAsString = isObjectOrArray(newState)
        ? JSON.stringify(newState)
        : String(newState);
      newSearchParams.set(searchQueryKey, newStateAsString);

      // Update search params in the URL
      setSearchParams(newSearchParams);

      // Update the local state
      setState(convertToOriginalType(newState, initialType));
    },
    [initialType, searchQueryKey, searchParams, setSearchParams]
  );

  /**
   * Update state when search param change
   *
   * Notes:
   * - Be careful when updating state,
   * - Using setstate with inappropriate conditions can lead to infinite loops
   */
  React.useEffect(() => {
    // Convert search param to origin type (type of initial value)
    const paramValue = convertToOriginalType(
      searchParams.get(searchQueryKey),
      initialType
    );

    // Only update page state if the value differs from current state
    setState((prevState) => {
      if (
        String(paramValue) !== String(prevState) &&
        !SearchParamEmptyTypes.includes(paramValue)
      ) {
        return paramValue;
      } else {
        return prevState;
      }
    });
  }, [initialType, searchParams, searchQueryKey]);

  return [state, updateState];
};

export default useSearchParamState;
