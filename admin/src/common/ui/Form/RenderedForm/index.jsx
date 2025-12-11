import {memo, useCallback, useEffect, useMemo} from 'react';
import {Alert, Box} from '@mantine/core';
import FieldTypeRenderer from './FieldTypeRenderer.jsx';
import H1 from '../../H1.jsx';
import Button from '../../Button.jsx';
import {useTranslation} from 'react-i18next';
import useFormFieldsData from './useFormFieldsData.js';
import fromPairs from 'lodash/fromPairs.js';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {FormFieldType} from '../../../../constants/form.js';
import clsx from 'clsx';

/**
 * Render submission limit hint
 *
 * If 'props.submissionsRemaining' is null, it means no limited for submission
 *
 * @type {React.NamedExoticComponent<{
 * readonly formContent: FormContent
 * readonly submissionsRemaining: number | null
 * }>}
 */
const SubmissionLimitHint = memo(
  ({formContent, submissionsRemaining = null}) => {
    // Translation
    const {t} = useTranslation();

    return (
      <Box>
        {formContent.show_remaining_submissions &&
          submissionsRemaining !== null && (
            <>
              {submissionsRemaining === 0 ? (
                <Box component="p" className="text-primary-main text-xs">
                  {t(
                    'This form has reached its submission limit and is no longer accepting responses.'
                  )}
                </Box>
              ) : (
                <Box component="p" className="text-gray-pale-sky text-xs">
                  {t(
                    'Limited availability: {{submissions_remaining}}/{{max_submissions}} submissions remaining.',
                    {
                      submissions_remaining: submissionsRemaining,
                      max_submissions: formContent.max_submissions || 0,
                    }
                  )}
                </Box>
              )}
            </>
          )}
      </Box>
    );
  }
);
SubmissionLimitHint.displayName = 'SubmissionLimitHint';

/**
 * The rendered form
 *
 * @param {FormContent} formContent
 * @param {Record<number, FormSubmissionData>=} initialFieldsData
 * @param {(submissionData: Record<number, FormSubmissionData>) => void} onSubmit
 * @param {boolean} loading
 * @param {boolean} submitted
 *
 * @returns {JSX.Element}
 * @constructor
 */
const RenderedForm = ({
  formContent,
  onSubmit = () => {},
  loading = false,
  submitted = false,
  initialFieldsData = {},
}) => {
  // Translation
  const {t} = useTranslation();

  /**
   * Get form fields
   * @type {Array<FormField>}
   */
  const fields = useMemo(() => formContent.fields || [], [formContent.fields]);

  /**
   * Submission remaining
   * If value is NULL, it means no limited for submission
   *
   * @type {number | null}
   */
  const submissionsRemaining = useMemo(
    () =>
      ['', null, undefined].includes(formContent.max_submissions)
        ? null
        : Math.max(
            0,
            +formContent.max_submissions - (formContent.submissions_count || 0)
          ),
    [formContent.max_submissions, formContent.submissions_count]
  );

  /**
   * Whether it's reached submission limit,
   * Note: submissionsRemaining === null, it means no limited
   * @type {boolean}
   */
  const reachedSubmissionLimit = useMemo(
    () => submissionsRemaining === 0,
    [submissionsRemaining]
  );

  // Form fields data
  const {formFieldsData, setFieldData, setFormFieldsData} = useFormFieldsData(
    fromPairs(
      fields.map((field) => [
        field.id || field._id,
        {
          field_id: field.id || field._id,
          field_snap_short: field,
          value: null,
          _field: field, // Internal field -> DELETE this when submit to backend
          _error: '', // Internal field -> DELETE this when submit to backend
        },
      ])
    )
  );

  /**
   * Validate form
   *
   * @type {function(): boolean}
   */
  const validate = useCallback(() => {
    let valid = true;
    Object.keys(formFieldsData).forEach((fieldId) => {
      const fieldData = formFieldsData[fieldId];

      // Clear validation hint
      setFieldData(fieldId, {_error: ''});

      // Validating required fields
      if (fieldData._field.required) {
        let isEmpty;

        // Check if field is empty based on field type
        switch (fieldData._field.field_type) {
          case FormFieldType.Files:
            // For files field, check if array is empty or null/undefined
            isEmpty =
              !fieldData.value ||
              !Array.isArray(fieldData.value) ||
              fieldData.value.length === 0;
            break;

          case FormFieldType.Checkboxes:
            // For checkboxes field, check if array is empty
            isEmpty =
              !Array.isArray(fieldData.value) || fieldData.value.length === 0;
            break;

          default:
            // For other field types (string, number, etc.)
            isEmpty = !fieldData.value;
            break;
        }

        if (isEmpty) {
          valid = false;
          setFieldData(fieldId, {
            _error:
              fieldData._field.field_config.validation_message ||
              t('Can not be empty for this field'),
          });
        }
      }
    });

    return valid;
  }, [formFieldsData, setFieldData, t]);

  /**
   * Handle submit
   * @type {() => void}
   */
  const handleSubmit = useCallback(() => {
    if (validate()) {
      onSubmit(formFieldsData);
    }
  }, [formFieldsData, onSubmit, validate]);

  /**
   * Update form fields data when initialFieldsData changes
   */
  useEffect(() => {
    // Function to get initial field data
    const getInitValue = (field) => {
      const initialFieldData = initialFieldsData[field.id];
      if (initialFieldData?.field_snap_short?.field_type === field.field_type) {
        return initialFieldData.value;
      } else {
        return null;
      }
    };

    // Only update if initialFieldsData has data and current value is empty
    if (Object.keys(initialFieldsData).length > 0) {
      setFormFieldsData((prevState) => ({
        ...prevState,
        ...fromPairs(
          fields
            .filter((field) => !!prevState[field.id || field._id])
            .map((field) => [
              field.id || field._id,
              {
                ...prevState[field.id || field._id],
                value:
                  prevState[field.id || field._id].value || getInitValue(field),
              },
            ])
        ),
      }));
    }
  }, [fields, initialFieldsData, setFormFieldsData]);

  return (
    <>
      <Box className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4">
        <Box className="space-y-3">
          <H1 className="!text-black !break-words !text-center">
            {formContent.title}
          </H1>
          <Box component="p" className="text-gray-pale-sky text-xs">
            {formContent.description}
          </Box>
          <SubmissionLimitHint
            formContent={formContent}
            submissionsRemaining={submissionsRemaining}
          />
        </Box>

        <Box
          component="form"
          className={clsx('space-y-3', {
            'pointer-events-none': submitted || reachedSubmissionLimit,
          })}
        >
          {fields.map((field, index) => (
            <Box key={index}>
              <FieldTypeRenderer
                field={field}
                value={formFieldsData[field.id || field._id]?.value}
                onChange={(value) => setFieldData(field.id, {value})}
                error={formFieldsData[field.id || field._id]?._error}
              />
            </Box>
          ))}
        </Box>

        <Box component="p" className="text-gray-shark">
          {formContent.closing_remarks}
        </Box>

        {submitted && (
          <Alert
            color="blue"
            title={
              <Box>
                <Box component="span">{formContent.success_message}</Box>
                {formContent.enable_public_statistics && (
                  <Box component="span">
                    <Box component="span"> </Box>
                    <a
                      className="underline"
                      href={`${location.href}/statistics`}
                    >
                      {t('Click here to see statistics for this form.')}
                    </a>
                  </Box>
                )}
              </Box>
            }
            icon={<FontAwesomeIcon icon={faCheckCircle} size="lg" />}
          />
        )}

        {!submitted && (
          <Box className="text-end">
            <Button
              fullWidth
              loading={loading}
              disabled={submitted || reachedSubmissionLimit}
              onClick={handleSubmit}
            >
              {t('Submit')}
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};

export default RenderedForm;
