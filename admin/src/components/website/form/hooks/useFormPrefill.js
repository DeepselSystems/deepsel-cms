import {useCallback} from 'react';
import {useLocalStorage} from '@mantine/hooks';
import {FormFieldType} from '../../../../constants/form.js';

/**
 * Storage key for all form prefill data
 */
const FORM_PREFILL_STORAGE_KEY = 'form_prefill_data';

/**
 * Extract form slug from URL path
 * Example: /forms/weekly-report -> weekly-report
 *
 * @param {string} path
 * @returns {string|null}
 */
const extractFormSlugFromPath = (path) => {
  const match = path.match(/\/forms\/([^/?]+)/);
  return match ? match[1] : null;
};

/**
 * Custom hook to manage form prefill data in localStorage
 * Stores all form data in a single localStorage key with structure
 */
const useFormPrefill = () => {
  // Localstorage data
  const [allFormsData, setAllFormsData] =
    /**@type {[Record<number, FormSubmissionData>, import('react').Dispatch<import('react').SetStateAction<Record<number, FormSubmissionData>>>]} */
    useLocalStorage({
      key: FORM_PREFILL_STORAGE_KEY,
      defaultValue: {},
    });

  /**
   * Get prefill data for a specific form
   * Validates that field IDs exist in current form structure to handle form changes
   *
   * @type {(formSlug: string, fields: Array<{id: number|string}>) => Record<string, any>}
   */
  const getFormPrefillData = useCallback(
    (formSlug, fields = []) => {
      if (!formSlug || !allFormsData[formSlug]) {
        return {};
      }
      const savedData = allFormsData[formSlug];
      const validFieldIds = new Set(
        fields.map((field) => String(field.id || field._id))
      );

      // Filter out fields that no longer exist in current form structure
      const validatedData = {};
      Object.keys(savedData).forEach((fieldId) => {
        if (validFieldIds.has(String(fieldId))) {
          validatedData[fieldId] = savedData[fieldId];
        }
      });

      return validatedData;
    },
    [allFormsData]
  );

  /**
   * Save form data to localStorage
   *
   * @type {(formSlug: string, submissionData: Record<number, FormSubmissionData>) => void}
   */
  const saveFormPrefillData = useCallback(
    (formSlug, submissionData) => {
      if (!formSlug) return;

      // Extract only values from form data, exclude internal fields
      const excludedTypes = [FormFieldType.Files];
      const dataToSave = {};
      Object.keys(submissionData).forEach((fieldId) => {
        const fieldData = submissionData[fieldId];
        if (fieldData && fieldData.value) {
          // Skip excluded type item
          if (excludedTypes.includes(fieldData.field_snap_short.field_type)) {
            return;
          }

          // Skip empty strings
          if (
            typeof fieldData.value === 'string' &&
            fieldData.value.trim() === ''
          ) {
            return;
          }

          // Skip empty arrays
          if (Array.isArray(fieldData.value) && fieldData.value.length === 0) {
            return;
          }

          // Assign data
          dataToSave[fieldId] = fieldData;
        }
      });

      setAllFormsData((prev) => {
        return {
          ...prev,
          [formSlug]: dataToSave,
        };
      });
    },
    [setAllFormsData]
  );

  /**
   * Clear prefill data for a specific form
   *
   * @type {(formSlug: string) => void}
   */
  const clearFormPrefillData = useCallback(
    (formSlug) => {
      if (!formSlug) return;

      setAllFormsData((prev) => {
        const newData = {...prev};
        delete newData[formSlug];
        return newData;
      });
    },
    [setAllFormsData]
  );

  return {
    getFormPrefillData,
    saveFormPrefillData,
    clearFormPrefillData,
  };
};

/**
 * Get current form key from browser location
 *
 * @returns {string|null} Form key or null
 */
export const getCurrentFormSlug = () => {
  if (typeof window === 'undefined') return null;
  return extractFormSlugFromPath(window.location.pathname);
};

export default useFormPrefill;
