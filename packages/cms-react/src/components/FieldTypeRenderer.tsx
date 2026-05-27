import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Radio,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput, DateTimePicker, TimePicker } from '@mantine/dates';
import { Dropzone } from '@mantine/dropzone';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import {
  FORM_FIELD_TYPE as FormFieldType,
  TIME_FORMAT as TimeFormat,
  formatFileSize,
  type FormField,
} from '@deepsel/cms-utils';

/** Default upload size limit in MB */
const DEFAULT_UPLOAD_SIZE_LIMIT_MB = 5;

/** Shape returned by the attachment upload API */
export interface UploadedFileRecord {
  id: string | number;
  name: string;
  content_type?: string | null;
  contentType?: string | null;
  filesize?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

/** Option object used in MultipleChoice / Checkboxes / Dropdown fields */
interface OptionObj {
  id?: string;
  value: string;
  label: string;
}

/**
 * Runtime field_config — the FormFieldConfig type has narrow types for some keys
 * (e.g. options typed as string[] but stored as OptionObj[]).
 * Cast to this for safe property access.
 */
interface RuntimeFieldConfig {
  options?: OptionObj[];
  min_value?: number | string | null;
  max_value?: number | string | null;
  min_length?: number | null;
  max_length?: number | null;
  max_files?: number | null;
  max_file_size?: number | null;
  allowed_file_types?: string | null;
  validation_pattern?: string | null;
  validation_message?: string | null;
  time_format?: string | null;
  step?: number | null;
  precision?: number | null;
}

export interface FieldTypeRendererProps {
  field: FormField;
  value?: unknown;
  error?: string;
  onChange?: (value: unknown) => void;
  /** Inject to enable file uploads — required only for Files field type */
  onUploadFiles?: (files: File[]) => Promise<UploadedFileRecord[]>;
  /** Inject to enable file deletion — required only for Files field type */
  onDeleteAttachment?: (id: string | number) => Promise<void>;
  /** Max upload size in MB shown in file field hint (default: 5) */
  uploadSizeLimit?: number;
}

/**
 * Renders the appropriate input component based on field type.
 * Pass `onUploadFiles` / `onDeleteAttachment` / `uploadSizeLimit` when the form has a Files field.
 */
export function FieldTypeRenderer({
  field,
  value,
  error = '',
  onChange = () => {},
  onUploadFiles,
  onDeleteAttachment,
  uploadSizeLimit = DEFAULT_UPLOAD_SIZE_LIMIT_MB,
}: FieldTypeRendererProps): React.ReactElement {
  const { t } = useTranslation();
  const { field_type, label, description, placeholder, required } = field;
  const fc = (field.field_config || {}) as unknown as RuntimeFieldConfig;

  const commonProps = {
    label,
    description: description ?? undefined,
    placeholder: placeholder ?? undefined,
    required,
    size: 'md' as const,
  };

  switch (field_type) {
    case FormFieldType.ShortAnswer:
      return (
        <TextInput
          {...commonProps}
          maxLength={fc.max_length ?? undefined}
          minLength={fc.min_length ?? undefined}
          value={(value as string) || ''}
          onChange={({ target: { value: v } }) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.Paragraph:
      return (
        <Textarea
          {...commonProps}
          minRows={3}
          maxRows={6}
          autosize
          maxLength={fc.max_length ?? undefined}
          minLength={fc.min_length ?? undefined}
          value={(value as string) || ''}
          onChange={({ target: { value: v } }) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.Number:
      return (
        <NumberInput
          {...commonProps}
          min={fc.min_value != null ? Number(fc.min_value) : undefined}
          max={fc.max_value != null ? Number(fc.max_value) : undefined}
          step={fc.step || 1}
          decimalScale={fc.precision || 0}
          value={(value as number) ?? ''}
          onChange={(v) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.MultipleChoice:
      return (
        <Radio.Group
          name={`field_${field.id}`}
          label={label}
          description={description ?? undefined}
          withAsterisk={required}
          value={(value as string) || null}
          onChange={(v) => onChange(v)}
          error={error}
        >
          <Stack mt="xs" gap="xs" mb="sm">
            {(fc.options || []).map((option, index) => (
              <Radio key={option.id || index} value={option.value} label={option.label} />
            ))}
          </Stack>
        </Radio.Group>
      );

    case FormFieldType.Checkboxes:
      return (
        <Checkbox.Group
          label={label}
          description={description ?? undefined}
          withAsterisk={required}
          value={(value as string[]) || []}
          onChange={(v) => onChange(v || [])}
          error={error}
        >
          <Stack mt="xs" gap="xs" mb="sm">
            {(fc.options || []).map((option, index) => (
              <Checkbox key={option.id || index} value={option.value} label={option.label} />
            ))}
          </Stack>
        </Checkbox.Group>
      );

    case FormFieldType.Dropdown:
      return (
        <Select
          {...commonProps}
          data={(fc.options || []).map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          searchable
          clearable={!required}
          value={(value as string) || null}
          onChange={(v) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.Date:
      return (
        <DateInput
          {...commonProps}
          valueFormat="YYYY-MM-DD"
          minDate={fc.min_value != null ? new Date(String(fc.min_value)) : undefined}
          maxDate={fc.max_value != null ? new Date(String(fc.max_value)) : undefined}
          value={value as Date}
          onChange={(v) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.Time:
      return (
        <TimePicker
          {...commonProps}
          withDropdown
          format={fc.time_format === TimeFormat.TWELVE_HOUR ? '12h' : '24h'}
          withSeconds={false}
          minutesStep={fc.step || 15}
          min={fc.min_value != null ? String(fc.min_value) : undefined}
          max={fc.max_value != null ? String(fc.max_value) : undefined}
          value={value as string}
          onChange={onChange as (v: string) => void}
          error={error}
        />
      );

    case FormFieldType.Datetime:
      return (
        <DateTimePicker
          {...commonProps}
          valueFormat={
            fc.time_format === TimeFormat.TWELVE_HOUR ? 'YYYY-MM-DD hh:mm' : 'YYYY-MM-DD HH:mm'
          }
          minDate={fc.min_value != null ? new Date(String(fc.min_value)) : undefined}
          maxDate={fc.max_value != null ? new Date(String(fc.max_value)) : undefined}
          withSeconds={false}
          value={value as Date}
          onChange={(v) => onChange(v)}
          error={error}
        />
      );

    case FormFieldType.Files:
      return (
        <FilesUploadField
          field={field}
          value={value as UploadedFileRecord[]}
          error={error}
          onChange={onChange}
          onUploadFiles={onUploadFiles}
          onDeleteAttachment={onDeleteAttachment}
          uploadSizeLimit={uploadSizeLimit}
        />
      );

    default:
      return (
        <Text c="dimmed" fs="italic">
          {t('Unsupported field type: {{field_type}}', { field_type })}
        </Text>
      );
  }
}

interface FilesUploadFieldProps {
  field: FormField;
  value?: UploadedFileRecord[];
  error?: string;
  onChange: (value: unknown) => void;
  onUploadFiles?: (files: File[]) => Promise<UploadedFileRecord[]>;
  onDeleteAttachment?: (id: string | number) => Promise<void>;
  uploadSizeLimit: number;
}

/**
 * File upload field with drag-and-drop support.
 * Delegates upload/delete to the injected handlers.
 */
function FilesUploadField({
  field,
  value = [],
  error,
  onChange,
  onUploadFiles,
  onDeleteAttachment,
  uploadSizeLimit,
}: FilesUploadFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { label, description, required } = field;
  const fc = (field.field_config || {}) as unknown as RuntimeFieldConfig;

  const maxFiles = fc.max_files || 3;
  const maxFileSizeMB = fc.max_file_size || uploadSizeLimit;
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  const allowedTypes = fc.allowed_file_types || 'image/*';

  const handleFileDrop = async (files: File[]) => {
    const current = Array.isArray(value) ? value : [];
    if (current.length + files.length > maxFiles) {
      setUploadError(t('Maximum {{maxFiles}} files allowed', { maxFiles }));
      return;
    }
    if (!onUploadFiles) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await onUploadFiles(files);
      const fileObjects = uploaded.map((f) => ({
        ...f,
        contentType: f.content_type ?? f.contentType,
        createdAt: f.created_at ?? f.createdAt,
      }));
      onChange([...current, ...fileObjects]);
    } catch {
      setUploadError(t('File upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (index: number) => {
    const current = Array.isArray(value) ? value : [];
    const file = current[index];
    setDeleteLoading(true);
    try {
      if (file?.id && onDeleteAttachment) {
        await onDeleteAttachment(file.id);
      }
    } catch {
      // still remove from UI
    } finally {
      setDeleteLoading(false);
    }
    onChange(current.filter((_, i) => i !== index));
  };

  const getFileName = (file: UploadedFileRecord): string => {
    if (file.name) return String(file.name);
    return t('Unknown file');
  };

  const current = Array.isArray(value) ? value : [];
  const canAddMore = current.length < maxFiles;

  return (
    <Box>
      <Text size="sm" fw={500} mb="xs">
        {label}
        {required && (
          <Text component="span" c="red">
            {' *'}
          </Text>
        )}
      </Text>

      {description && (
        <Text size="xs" c="dimmed" mb="sm">
          {description}
        </Text>
      )}

      {canAddMore && (
        <Dropzone
          onDrop={(files) => {
            void handleFileDrop(files);
          }}
          maxSize={maxFileSizeBytes}
          accept={allowedTypes === '*' ? undefined : [allowedTypes]}
          multiple={maxFiles > 1}
          mb="sm"
          loading={uploading}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
        >
          <Group gap="sm" style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={16} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconAlertTriangle size={16} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload size={16} />
            </Dropzone.Idle>
            <Box>
              <Text size="sm" fw={500}>
                {t('Drag files here or click to select')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('Maximum {{maxFiles}} files, {{maxSize}}MB each', {
                  maxFiles,
                  maxSize: maxFileSizeMB,
                })}
              </Text>
            </Box>
          </Group>
        </Dropzone>
      )}

      {current.length > 0 && (
        <Stack gap="xs">
          {current.map((file, index) => (
            <Group
              key={String(file.id ?? index)}
              justify="space-between"
              p="sm"
              className="border rounded"
            >
              <Group gap="sm">
                <IconFile size={16} />
                <Box>
                  <Text size="sm" fw={500}>
                    {getFileName(file)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {file.contentType && `${file.contentType}`}
                    {file.filesize != null && ` • ${formatFileSize(file.filesize)}`}
                  </Text>
                </Box>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                loading={deleteLoading}
                onClick={() => void handleRemoveFile(index)}
              >
                <IconTrash size={16} />
              </Button>
            </Group>
          ))}
        </Stack>
      )}

      <Text size="xs" c="dimmed" mt="xs">
        {t('{{current}} of {{max}} files uploaded', {
          current: current.length,
          max: maxFiles,
        })}
      </Text>

      {(error || uploadError) && (
        <Text size="sm" c="red" mt="xs">
          {error || uploadError}
        </Text>
      )}
    </Box>
  );
}
