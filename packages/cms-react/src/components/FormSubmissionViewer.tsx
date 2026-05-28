import React from 'react';
import { Alert, Badge, Box, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import {
  FORM_FIELD_TYPE as FormFieldType,
  formatFileSize,
  type FormData,
  type FormField,
  type FormSubmissionFieldValue,
} from '@deepsel/cms-utils';
import type { UploadedFileRecord } from './FormFieldTypeRenderer.js';

/** A snapshot of a field merged with its submitted value — for internal use only */
interface SubmissionFieldSnapshot extends Record<string, unknown> {
  _submittedValue: unknown;
  _isDeleted: boolean;
}

export interface FormSubmissionViewerProps {
  formContent: FormData;
  submissionData: Record<number, FormSubmissionFieldValue>;
  /** Whether to render the form title and description (default: true) */
  showTitle?: boolean;
  /**
   * Optional renderer for file entries in Files fields.
   * When omitted a simple name + metadata row is shown.
   */
  renderFile?: (file: UploadedFileRecord, index: number) => React.ReactNode;
}

/**
 * Read-only view of a submitted form response.
 * Pass `renderFile` to customise how uploaded files are displayed (e.g. to show image previews).
 */
export function FormSubmissionViewer({
  formContent,
  submissionData,
  showTitle = true,
  renderFile,
}: FormSubmissionViewerProps): React.ReactElement {
  const { t } = useTranslation();

  const submissionFields = React.useMemo<SubmissionFieldSnapshot[]>(() => {
    if (!submissionData) return [];
    const currentIds = new Set(formContent?.fields?.map((f) => f.id) ?? []);
    return Object.values(submissionData).map((fd) => ({
      ...(fd.field_snap_short as Record<string, unknown>),
      _submittedValue: fd.value,
      _isDeleted: !currentIds.has((fd.field_snap_short as { id?: number })?.id ?? -1),
    }));
  }, [submissionData, formContent?.fields]);

  if (!formContent) {
    return (
      <Box className="text-center py-8">
        <Text c="dimmed">{t('No form data available')}</Text>
      </Box>
    );
  }

  return (
    <Box className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4">
      {showTitle && (
        <Box className="space-y-3">
          <Text size="xl" fw={700} className="text-black break-words text-center">
            {formContent.title}
          </Text>
          {formContent.description && (
            <Text size="sm" c="dimmed">
              {formContent.description}
            </Text>
          )}
        </Box>
      )}

      <Box className="space-y-3">
        {submissionFields.map((field, index) => (
          <Box key={index} className="p-4 bg-gray-50 rounded-lg border">
            <Stack gap="xs">
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  {typeof field.label === 'string' ? field.label : ''}
                  {Boolean(field.required) && (
                    <Text component="span" c="red">
                      {' *'}
                    </Text>
                  )}
                </Text>
              </Group>

              {Boolean(field.description) && (
                <Text size="xs" c="dimmed">
                  {String(field.description)}
                </Text>
              )}

              <Box className="mt-2">
                <SubmittedValueDisplay
                  field={field as unknown as FormField}
                  value={field._submittedValue}
                  renderFile={renderFile}
                />
              </Box>

              {field._isDeleted && (
                <Alert color="orange" variant="light" icon={<IconInfoCircle size={16} />}>
                  <Text size="xs">{t('This field has been removed from the current form')}</Text>
                </Alert>
              )}
            </Stack>
          </Box>
        ))}
      </Box>

      {formContent.closing_remarks && (
        <Text size="sm" c="dimmed">
          {formContent.closing_remarks}
        </Text>
      )}
    </Box>
  );
}

interface SubmittedValueDisplayProps {
  field: FormField;
  value: unknown;
  renderFile?: (file: UploadedFileRecord, index: number) => React.ReactNode;
}

/** Renders the submitted value in the appropriate format for each field type */
function SubmittedValueDisplay({
  field,
  value,
  renderFile,
}: SubmittedValueDisplayProps): React.ReactElement {
  const { t } = useTranslation();

  if (value === null || value === undefined || value === '') {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        {t('No answer provided')}
      </Text>
    );
  }

  switch (field.field_type) {
    case FormFieldType.Checkboxes:
      if (Array.isArray(value) && value.length > 0) {
        return (
          <Group gap="xs">
            {value.map((item, i) => (
              <Badge key={i} variant="outline" size="sm">
                {String(item)}
              </Badge>
            ))}
          </Group>
        );
      }
      break;

    case FormFieldType.MultipleChoice:
    case FormFieldType.Dropdown:
      return (
        <Badge variant="outline" size="sm">
          {value as string}
        </Badge>
      );

    case FormFieldType.Date:
      return (
        <Text size="sm" fw={500}>
          {dayjs(value as string).format('DD MMM YYYY')}
        </Text>
      );

    case FormFieldType.Datetime:
      return (
        <Text size="sm" fw={500}>
          {dayjs(value as string).format('DD MMM YYYY HH:mm')}
        </Text>
      );

    case FormFieldType.Time:
      return (
        <Text size="sm" fw={500}>
          {dayjs(value as string, 'HH:mm:ss').format('HH:mm')}
        </Text>
      );

    case FormFieldType.Number:
      return (
        <Text size="sm" fw={500} className="font-mono">
          {Number(value).toLocaleString()}
        </Text>
      );

    case FormFieldType.Paragraph:
      return (
        <Text size="sm" fw={500} className="break-words whitespace-pre-wrap">
          {value as string}
        </Text>
      );

    case FormFieldType.Files:
      if (Array.isArray(value) && value.length > 0) {
        return (
          <Stack gap="md">
            {(value as UploadedFileRecord[]).map((file, i) => {
              if (renderFile) return <React.Fragment key={i}>{renderFile(file, i)}</React.Fragment>;
              return <DefaultFileRow key={i} file={file} />;
            })}
          </Stack>
        );
      }
      break;

    default:
      return (
        <Text size="sm" fw={500} className="break-words">
          {value as string}
        </Text>
      );
  }

  return (
    <Text size="sm" c="dimmed" fs="italic">
      {t('No answer provided')}
    </Text>
  );
}

/** Fallback file row when no renderFile DI is provided */
function DefaultFileRow({ file }: { file: UploadedFileRecord }): React.ReactElement {
  const contentType = file.contentType ?? file.content_type;
  const fileSize = file.filesize != null ? formatFileSize(file.filesize) : null;

  return (
    <Box className="p-3 bg-white rounded border border-gray-200 shadow-sm">
      <Group gap="md">
        <Box className="flex-1">
          <Text size="sm" fw={500} className="text-gray-900">
            {String(file.name)}
          </Text>
          <Group gap="xs">
            {contentType && (
              <Text size="xs" c="dimmed">
                {contentType}
              </Text>
            )}
            {fileSize && (
              <>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <Text size="xs" c="dimmed">
                  {fileSize}
                </Text>
              </>
            )}
          </Group>
        </Box>
      </Group>
    </Box>
  );
}
