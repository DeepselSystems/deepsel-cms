import {useMemo} from 'react';

/**
 *
 * @param {FormField} formField
 * @param {Array<FormSubmission>} formSubmissions - Array of all submissions for this form content
 *
 * @returns {{fieldSubmissions: Array<FormSubmissionData>}}
 */
const useSubmissionStatisticsData = (formField, formSubmissions) => {
  /**
   * @type {Array<FormSubmissionData>}
   */
  const fieldSubmissions = useMemo(() => {
    const result = [];
    formSubmissions.forEach((formSubmission) => {
      const fieldSubmission = formSubmission.submission_data[formField.id];
      if (
        fieldSubmission &&
        fieldSubmission.field_snap_short.field_type === formField.field_type
      ) {
        result.push(fieldSubmission);
      }
    });
    return result;
  }, [formField.field_type, formField.id, formSubmissions]);

  return {
    fieldSubmissions,
  };
};

export default useSubmissionStatisticsData;
