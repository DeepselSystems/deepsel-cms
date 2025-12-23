import React from 'react';
import { Box, Text, Group, Badge, Stack, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import { FormFieldType } from '../../../../constants/form.js';
import FileDisplay from '../../FileDisplay.jsx';
import { formatFileSize } from '../../../utils/index.js';

/**
 * Component to display a submitted form with read-only data
 * @param {Object} props
 * @param {FormContent} props.formContent - The form content structure
 * @param {Record<number, FormSubmissionData>} props.submissionData - The submitted data
 * @param {boolean} props.showTitle - Whether to show form title and description
 * @returns {JSX.Element}
 */
const SubmittedFormViewer = ({ formContent, submissionData, showTitle = true }) => {
  // Translation
  const { t } = useTranslation();

  // Get fields from submission data (field_snap_short) instead of current form content
  const submissionFields = React.useMemo(() => {
    if (!submissionData) return [];

    const currentFormFieldIds = new Set(formContent?.fields?.map((f) => f.id) || []);

    return Object.values(submissionData).map((fieldData) => ({
      ...fieldData.field_snap_short,
      _submittedValue: fieldData.value,
      _isDeleted: !currentFormFieldIds.has(fieldData.field_snap_short.id),
    }));
  }, [submissionData, formContent?.fields]);

  if (!formContent) {
    return (
      <Box className="text-center text-gray-pale-sky py-8">
        <Text>{t('No form data available')}</Text>
      </Box>
    );
  }

  return (
    <Box className="container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-4">
      {/* Form Title and Description */}
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

      {/* Form Fields */}
      <Box className="space-y-3">
        {submissionFields.map((field, index) => {
          const submittedValue = field._submittedValue;
          const isDeleted = field._isDeleted;

          return (
            <Box key={index} className="p-4 bg-gray-50 rounded-lg border">
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {field.label}
                    {field.required && (
                      <Text component="span" c="red">
                        {' '}
                        *
                      </Text>
                    )}
                  </Text>
                </Group>

                {field.description && (
                  <Text size="xs" c="dimmed">
                    {field.description}
                  </Text>
                )}

                <Box className="mt-2">
                  <SubmittedValueDisplay field={field} value={submittedValue} />
                </Box>

                {/* Show deleted field warning */}
                {isDeleted && (
                  <Alert
                    color="orange"
                    variant="light"
                    size="xs"
                    icon={<FontAwesomeIcon icon={faInfoCircle} />}
                  >
                    {t('This field has been removed from the current form')}
                  </Alert>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* Closing Remarks */}
      {formContent.closing_remarks && (
        <Text size="sm" c="dimmed">
          {formContent.closing_remarks}
        </Text>
      )}
    </Box>
  );
};

/**
 * Component to display submitted value based on field type
 * @param {Object} props
 * @param {FormField} props.field - The form field configuration
 * @param {any} props.value - The submitted value
 * @returns {JSX.Element}
 */
const SubmittedValueDisplay = ({ field, value }) => {
  const { t } = useTranslation();

  if (value === null || value === undefined || value === '') {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        {t('No answer provided')}
      </Text>
    );
  }

  // Handle different field types
  switch (field.field_type) {
    case FormFieldType.Checkboxes:
      if (Array.isArray(value) && value.length > 0) {
        return (
          <Group gap="xs">
            {value.map((item, index) => (
              <Badge key={index} variant="outline" size="sm">
                {item}
              </Badge>
            ))}
          </Group>
        );
      }
      break;

    case FormFieldType.MultipleChoice:
      return (
        <Badge variant="outline" size="sm">
          {value}
        </Badge>
      );

    case FormFieldType.Dropdown:
      return (
        <Badge variant="outline" size="sm">
          {value}
        </Badge>
      );

    case FormFieldType.Date:
      if (value) {
        return (
          <Text size="sm" fw={500}>
            {dayjs(value).format('DD MMM YYYY')}
          </Text>
        );
      }
      break;

    case FormFieldType.Datetime:
      if (value) {
        return (
          <Text size="sm" fw={500}>
            {dayjs(value).format('DD MMM YYYY HH:mm')}
          </Text>
        );
      }
      break;

    case FormFieldType.Time:
      if (value) {
        return (
          <Text size="sm" fw={500}>
            {dayjs(value, 'HH:mm:ss').format('HH:mm')}
          </Text>
        );
      }
      break;

    case FormFieldType.Number:
      return (
        <Text size="sm" fw={500} className="font-mono">
          {Number(value).toLocaleString()}
        </Text>
      );

    case FormFieldType.Paragraph:
      return (
        <Text size="sm" fw={500} className="break-words whitespace-pre-wrap">
          {String(value)}
        </Text>
      );

    case FormFieldType.Files:
      if (Array.isArray(value) && value.length > 0) {
        return (
          <Stack gap="md">
            {value.map((file, index) => {
              // Handle both file objects and legacy URL strings
              const isFileObject = typeof file === 'object' && file !== null;
              const fileName = isFileObject
                ? file.name
                : typeof file === 'string'
                  ? file.split('/').pop() || file
                  : t('Unknown file');
              const fileSize = isFileObject && file.filesize ? formatFileSize(file.filesize) : null;
              const contentType = isFileObject ? file.contentType || file.content_type : null;
              const fileId = isFileObject ? file.id : null;

              // Determine file type for FileDisplay component
              const getFileType = () => {
                if (!contentType) return 'other';
                if (contentType.startsWith('image/')) return 'image';
                if (contentType.startsWith('video/')) return 'video';
                return 'other';
              };

              // FileDisplay expects string src, convert file.id to string or use file name
              const fileSrc = isFileObject ? String(file.name) : file;

              return (
                <Box
                  key={fileId || index}
                  className="p-3 bg-white rounded border border-gray-200 shadow-sm"
                >
                  <Group gap="md" align="flex-start">
                    {/* File Display Component */}
                    <FileDisplay
                      showMenuOnHover
                      src={fileSrc}
                      type={getFileType()}
                      width={60}
                      height={60}
                      alt={fileName}
                      dropdownPosition="right-start"
                    />

                    {/* File Information */}
                    <Box className="flex-1">
                      <Text size="sm" fw={500} className="text-gray-900 mb-1">
                        {fileName}
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
            })}
          </Stack>
        );
      }
      break;

    default:
      return (
        <Text size="sm" fw={500} className="break-words">
          {String(value)}
        </Text>
      );
  }

  return (
    <Text size="sm" c="dimmed" fs="italic">
      {t('No answer provided')}
    </Text>
  );
};

export default SubmittedFormViewer;
