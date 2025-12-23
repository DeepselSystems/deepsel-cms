import { useCallback, useState } from 'react';

/**
 * Custom hook to manage form fields data
 * @param {Record<number, FormSubmissionData>=} initFormFieldsData
 */
const useFormFieldsData = (initFormFieldsData = {}) => {
  /**
   * Form fields data state
   * Structure: {[filedId]: <Object data of FormSubmissionData>}
   */
  const [formFieldsData, setFormFieldsData] = useState(
    /**@type {Record<number, FormSubmissionData>}*/ initFormFieldsData,
  );

  /**
   * Set field data by field id
   * @type {(fieldId: number, data: Partial<FormSubmission>) => void}
   */
  const setFieldData = useCallback((fieldId, data) => {
    setFormFieldsData((prevState) => ({
      ...prevState,
      [fieldId]: {
        ...(prevState[fieldId] || {}),
        ...(data || {}),
      },
    }));
  }, []);

  return { formFieldsData, setFormFieldsData, setFieldData };
};

export default useFormFieldsData;
