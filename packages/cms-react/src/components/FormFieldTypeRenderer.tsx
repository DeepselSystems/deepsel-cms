import React, { useState } from 'react';
import clsx from 'clsx';
import { Dropzone } from '@mantine/dropzone';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import {
  FORM_FIELD_TYPE as FormFieldType,
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
 * Runtime field_config — cast to this for safe property access.
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

export interface FormFieldTypeRendererProps {
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
  className?: string;
}

/** Renders label, description, the field control, and error message */
function FieldWrapper({
  label,
  description,
  required,
  error,
  className,
  children,
}: {
  label: string;
  description?: string | null;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('form-field-root', className)}>
      <label className="form-field-label">
        {label}
        {required && (
          <span className="form-field-required" aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>
      {description && <p className="form-field-description">{description}</p>}
      {children}
      {error && (
        <p className="form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Renders the appropriate native HTML input for a given form field type.
 * Date/Time/Datetime use native browser inputs. File upload uses Dropzone.
 */
export function FormFieldTypeRenderer({
  field,
  value,
  error = '',
  onChange = () => {},
  onUploadFiles,
  onDeleteAttachment,
  uploadSizeLimit = DEFAULT_UPLOAD_SIZE_LIMIT_MB,
  className,
}: FormFieldTypeRendererProps): React.ReactElement {
  const { t } = useTranslation();
  const { field_type, label, description, placeholder, required } = field;
  const fc = (field.field_config || {}) as unknown as RuntimeFieldConfig;

  const wrapperProps = { label, description, required, error, className };

  switch (field_type) {
    case FormFieldType.ShortAnswer:
      return (
        <FieldWrapper {...wrapperProps}>
          <input
            type="text"
            placeholder={placeholder ?? undefined}
            required={required}
            maxLength={fc.max_length ?? undefined}
            minLength={fc.min_length ?? undefined}
            value={(value as string) || ''}
            onChange={({ target: { value: v } }) => onChange(v)}
          />
        </FieldWrapper>
      );

    case FormFieldType.Paragraph:
      return (
        <FieldWrapper {...wrapperProps}>
          <textarea
            placeholder={placeholder ?? undefined}
            required={required}
            maxLength={fc.max_length ?? undefined}
            minLength={fc.min_length ?? undefined}
            value={(value as string) || ''}
            onChange={({ target: { value: v } }) => onChange(v)}
            rows={3}
          />
        </FieldWrapper>
      );

    case FormFieldType.Number:
      return (
        <FieldWrapper {...wrapperProps}>
          <input
            type="number"
            placeholder={placeholder ?? undefined}
            required={required}
            min={fc.min_value != null ? Number(fc.min_value) : undefined}
            max={fc.max_value != null ? Number(fc.max_value) : undefined}
            step={fc.step || 1}
            value={(value as number) ?? ''}
            onChange={({ target: { value: v } }) => onChange(v === '' ? '' : Number(v))}
          />
        </FieldWrapper>
      );

    case FormFieldType.MultipleChoice:
      return (
        <FieldWrapper {...wrapperProps}>
          <div className="form-field-options">
            {(fc.options || []).map((option, index) => (
              <label key={option.id || index} className="form-field-option">
                <input
                  type="radio"
                  name={`field_${field.id}`}
                  value={option.value}
                  checked={(value as string) === option.value}
                  onChange={() => onChange(option.value)}
                  required={required}
                />
                {option.label}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );

    case FormFieldType.Checkboxes:
      return (
        <FieldWrapper {...wrapperProps}>
          <div className="form-field-options">
            {(fc.options || []).map((option, index) => (
              <label key={option.id || index} className="form-field-option">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={((value as string[]) || []).includes(option.value)}
                  onChange={({ target: { checked } }) => {
                    const current = (value as string[]) || [];
                    onChange(
                      checked
                        ? [...current, option.value]
                        : current.filter((v) => v !== option.value),
                    );
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );

    case FormFieldType.Dropdown:
      return (
        <FieldWrapper {...wrapperProps}>
          <select
            required={required}
            value={(value as string) || ''}
            onChange={({ target: { value: v } }) => onChange(v)}
          >
            {!required && <option value="">—</option>}
            {(fc.options || []).map((option, index) => (
              <option key={option.id || index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );

    case FormFieldType.Date:
      return (
        <FieldWrapper {...wrapperProps}>
          <input
            type="date"
            required={required}
            min={fc.min_value != null ? String(fc.min_value) : undefined}
            max={fc.max_value != null ? String(fc.max_value) : undefined}
            value={
              value instanceof Date ? value.toISOString().split('T')[0] : (value as string) || ''
            }
            onChange={({ target: { value: v } }) => onChange(v)}
          />
        </FieldWrapper>
      );

    case FormFieldType.Time:
      return (
        <FieldWrapper {...wrapperProps}>
          <input
            type="time"
            required={required}
            /** step is in seconds for native time input; fc.step is in minutes */
            step={(fc.step || 15) * 60}
            min={fc.min_value != null ? String(fc.min_value) : undefined}
            max={fc.max_value != null ? String(fc.max_value) : undefined}
            value={(value as string) || ''}
            onChange={({ target: { value: v } }) => onChange(v)}
          />
        </FieldWrapper>
      );

    case FormFieldType.Datetime:
      return (
        <FieldWrapper {...wrapperProps}>
          <input
            type="datetime-local"
            required={required}
            min={fc.min_value != null ? String(fc.min_value) : undefined}
            max={fc.max_value != null ? String(fc.max_value) : undefined}
            value={
              value instanceof Date ? value.toISOString().slice(0, 16) : (value as string) || ''
            }
            onChange={({ target: { value: v } }) => onChange(v)}
          />
        </FieldWrapper>
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
          className={className}
        />
      );

    default:
      return (
        <p className={clsx('form-field-unsupported', className)}>
          {t('Unsupported field type: {{field_type}}', { field_type })}
        </p>
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
  className?: string;
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
  className,
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
      // still remove from UI on failure
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
    <div className={clsx('form-field-root', className)}>
      <label className="form-field-label">
        {label}
        {required && (
          <span className="form-field-required" aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>

      {description && <p className="form-field-description">{description}</p>}

      {canAddMore && (
        <Dropzone
          onDrop={(files) => {
            void handleFileDrop(files);
          }}
          maxSize={maxFileSizeBytes}
          accept={allowedTypes === '*' ? undefined : [allowedTypes]}
          multiple={maxFiles > 1}
          loading={uploading}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors mb-2"
        >
          <div className="flex items-center gap-2" style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={16} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconAlertTriangle size={16} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload size={16} />
            </Dropzone.Idle>
            <div>
              <p className="text-sm font-medium">{t('Drag files here or click to select')}</p>
              <p className="text-xs text-gray-500">{`Maximum ${maxFiles} files, ${maxFileSizeMB}MB each`}</p>
            </div>
          </div>
        </Dropzone>
      )}

      {current.length > 0 && (
        <div className="flex flex-col gap-2">
          {current.map((file, index) => (
            <div
              key={String(file.id ?? index)}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div className="flex items-center gap-2">
                <IconFile size={16} />
                <div>
                  <p className="text-sm font-medium">{getFileName(file)}</p>
                  <p className="text-xs text-gray-500">
                    {file.contentType && `${file.contentType}`}
                    {file.filesize != null && ` • ${formatFileSize(file.filesize)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => void handleRemoveFile(index)}
                className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">{`${current.length} of ${maxFiles} files uploaded`}</p>

      {(error || uploadError) && (
        <p className="form-field-error" role="alert">
          {error || uploadError}
        </p>
      )}
    </div>
  );
}
