import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Alert, Box, Button, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconCircleCheck } from '@tabler/icons-react';
import clsx from 'clsx';
import {
  FORM_FIELD_TYPE as FormFieldType,
  type FormData,
  type FormField,
  type FormSubmissionFieldValue,
} from '@deepsel/cms-utils';
import { FieldTypeRenderer, type UploadedFileRecord } from './FieldTypeRenderer.js';
import { useFormFieldsData } from '../hooks/useFormFieldsData.js';

/** Per-field state with internal UI tracking keys stripped before submission */
interface InternalFieldData extends Partial<FormSubmissionFieldValue> {
  _field?: FormField;
  _error?: string;
}

/** Shape received by the RenderedForm onSubmit callback */
export type FormSubmitData = Record<number, Record<string, unknown>>;

export interface RenderedFormProps {
  formContent: FormData;
  onSubmit?: (data: FormSubmitData) => void;
  loading?: boolean;
  submitted?: boolean;
  initialFieldsData?: Record<number, Partial<FormSubmissionFieldValue>>;
  /** Upload handler — required only when the form has a Files field */
  onUploadFiles?: (files: File[]) => Promise<UploadedFileRecord[]>;
  /** Delete handler — required only when the form has a Files field */
  onDeleteAttachment?: (id: string | number) => Promise<void>;
  /** Max upload size in MB shown in file field hint (default: 5) */
  uploadSizeLimit?: number;
}

/**
 * Renders a Deepsel CMS form with client-side validation and submission handling.
 * Pass `onUploadFiles` / `onDeleteAttachment` / `uploadSizeLimit` when the form has a Files field.
 */
export const RenderedForm = ({
  formContent,
  onSubmit = () => {},
  loading = false,
  submitted = false,
  initialFieldsData = {},
  onUploadFiles,
  onDeleteAttachment,
  uploadSizeLimit,
}: RenderedFormProps) => {
  const { t } = useTranslation();

  const fields = useMemo(() => formContent.fields || [], [formContent.fields]);

  /** Remaining submissions, or null when unlimited */
  const submissionsRemaining = useMemo(() => {
    const max = formContent.max_submissions;
    if (max === null || max === undefined) return null;
    return Math.max(0, Number(max) - (formContent.submissions_count || 0));
  }, [formContent.max_submissions, formContent.submissions_count]);

  const reachedSubmissionLimit = submissionsRemaining === 0;

  const initialData: Record<number, InternalFieldData> = Object.fromEntries(
    fields.map((field) => [
      field.id,
      {
        field_id: field.id,
        field_snap_short: field as unknown as Record<string, unknown>,
        value: null,
        _field: field,
        _error: '',
      },
    ]),
  );

  const { formFieldsData, setFieldData, setFormFieldsData } =
    useFormFieldsData<InternalFieldData>(initialData);

  const validate = useCallback(() => {
    let valid = true;
    Object.keys(formFieldsData).forEach((key) => {
      const id = Number(key);
      const fd = formFieldsData[id];
      setFieldData(id, { _error: '' });

      if (!fd?._field?.required) return;

      let isEmpty: boolean;
      switch (fd._field.field_type) {
        case FormFieldType.Files:
          isEmpty = !fd.value || !Array.isArray(fd.value) || (fd.value as unknown[]).length === 0;
          break;
        case FormFieldType.Checkboxes:
          isEmpty = !Array.isArray(fd.value) || (fd.value as unknown[]).length === 0;
          break;
        default:
          isEmpty = !fd.value;
      }

      if (isEmpty) {
        valid = false;
        const validationMsg = (fd._field.field_config as Record<string, unknown> | null | undefined)
          ?.validation_message as string | undefined;
        setFieldData(id, {
          _error: validationMsg || t('Can not be empty for this field'),
        });
      }
    });
    return valid;
  }, [formFieldsData, setFieldData, t]);

  const handleSubmit = useCallback(() => {
    if (validate()) {
      onSubmit(formFieldsData as unknown as FormSubmitData);
    }
  }, [formFieldsData, onSubmit, validate]);

  useEffect(() => {
    if (Object.keys(initialFieldsData).length === 0) return;

    const getInitValue = (field: FormField) => {
      const init = initialFieldsData[field.id];
      if (!init) return null;
      const snap = init.field_snap_short;
      return snap?.field_type === field.field_type ? init.value : null;
    };

    setFormFieldsData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        fields
          .filter((field) => !!prev[field.id])
          .map((field) => [
            field.id,
            {
              ...prev[field.id],
              value: prev[field.id]?.value || getInitValue(field),
            },
          ]),
      ),
    }));
  }, [fields, initialFieldsData, setFormFieldsData]);

  return (
    <Box className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4">
      <Box className="space-y-3">
        <h1 className="text-3xl font-bold text-black break-words text-center">
          {formContent.title}
        </h1>
        {formContent.description && (
          <Text size="xs" c="dimmed">
            {formContent.description}
          </Text>
        )}
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
              value={formFieldsData[field.id]?.value}
              onChange={(v) => setFieldData(field.id, { value: v })}
              error={formFieldsData[field.id]?._error}
              onUploadFiles={onUploadFiles}
              onDeleteAttachment={onDeleteAttachment}
              uploadSizeLimit={uploadSizeLimit}
            />
          </Box>
        ))}
      </Box>

      {formContent.closing_remarks && <Text c="dark">{formContent.closing_remarks}</Text>}

      {submitted && (
        <Alert
          color="blue"
          title={
            <Box>
              <Box component="span">{formContent.success_message}</Box>
              {formContent.enable_public_statistics && typeof window !== 'undefined' && (
                <Box component="span">
                  {' '}
                  <a className="underline" href={`${window.location.href}/statistics`}>
                    {t('Click here to see statistics for this form.')}
                  </a>
                </Box>
              )}
            </Box>
          }
          icon={<IconCircleCheck size={16} />}
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
  );
};

interface SubmissionLimitHintProps {
  formContent: FormData;
  submissionsRemaining: number | null;
}

/** Shows remaining-submissions hint when the form has a submission cap */
const SubmissionLimitHint = memo(
  ({ formContent, submissionsRemaining = null }: SubmissionLimitHintProps) => {
    const { t } = useTranslation();
    if (!formContent.show_remaining_submissions || submissionsRemaining === null) return null;

    return (
      <Box>
        {submissionsRemaining === 0 ? (
          <Text size="xs" c="red">
            {t('This form has reached its submission limit and is no longer accepting responses.')}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            {t(
              'Limited availability: {{submissions_remaining}}/{{max_submissions}} submissions remaining.',
              {
                submissions_remaining: submissionsRemaining,
                max_submissions: formContent.max_submissions || 0,
              },
            )}
          </Text>
        )}
      </Box>
    );
  },
);
SubmissionLimitHint.displayName = 'SubmissionLimitHint';
