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
import {DateInput, DateTimePicker, TimePicker} from '@mantine/dates';
import {Dropzone} from '@mantine/dropzone';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faFile,
  faTrash,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import {FormFieldType, TimeFormat} from '../../../../constants/form.js';
import {useTranslation} from 'react-i18next';
import useUploadSizeLimit from '../../../api/useUploadSizeLimit.js';
import useUpload from '../../../api/useUpload.js';
import useModel from '../../../api/useModel.jsx';
import {formatFileSize} from '../../../utils/index.js';

/**
 * Renders the appropriate input component based on field type
 *
 * @param {Object} props
 * @param {FormField} props.field - The form field configuration
 * @param {any} props.value - The form field configuration
 * @param {string} props.error - It can be validation error message
 * @param {(value: any) => void} props.onChange - The form field configuration
 * @returns {JSX.Element}
 */
const FieldTypeRenderer = ({field, value, error = '', onChange = () => {}}) => {
  // Translation
  const {t} = useTranslation();

  // Get fields configurations
  const {
    field_type,
    label,
    description,
    placeholder,
    required,
    field_config = {},
  } = field;

  // Get common props
  const commonProps = {
    label,
    description,
    placeholder,
    required,
    size: 'md',
  };

  switch (field_type) {
    case FormFieldType.ShortAnswer:
      return (
        <TextInput
          {...commonProps}
          maxLength={field_config.max_length}
          minLength={field_config.min_length}
          value={value || ''}
          onChange={({target: {value}}) => onChange(value)}
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
          maxLength={field_config.max_length}
          minLength={field_config.min_length}
          value={value || ''}
          onChange={({target: {value}}) => onChange(value)}
          error={error}
        />
      );

    case FormFieldType.Number:
      return (
        <NumberInput
          {...commonProps}
          min={field_config.min_value}
          max={field_config.max_value}
          step={field_config.step || 1}
          precision={field_config.precision || 0}
          value={value || null}
          onChange={(value) => onChange(value)}
          error={error}
        />
      );

    case FormFieldType.MultipleChoice:
      return (
        <Radio.Group
          name={`field_${field.id}`}
          label={label}
          description={description}
          withAsterisk={required}
          value={value || null}
          onChange={(value) => onChange(value)}
          error={error}
        >
          <Stack mt="xs" gap="xs" mb="sm">
            {(field_config.options || []).map((option, index) => (
              <Radio
                key={option.id || index}
                value={option.value}
                label={option.label}
              />
            ))}
          </Stack>
        </Radio.Group>
      );

    case FormFieldType.Checkboxes:
      return (
        <Checkbox.Group
          label={label}
          description={description}
          withAsterisk={required}
          value={value || []}
          onChange={(value) => onChange(value || [])}
          error={error}
        >
          <Stack mt="xs" gap="xs" mb="sm">
            {(field_config.options || []).map((option, index) => (
              <Checkbox
                key={option.id || index}
                value={option.value}
                label={option.label}
              />
            ))}
          </Stack>
        </Checkbox.Group>
      );

    case FormFieldType.Dropdown:
      return (
        <Select
          {...commonProps}
          data={(field_config.options || []).map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          searchable
          clearable={!required}
          value={value || null}
          onChange={(value) => onChange(value)}
          error={error}
        />
      );

    case FormFieldType.Date:
      return (
        <DateInput
          {...commonProps}
          valueFormat="YYYY-MM-DD"
          minDate={
            field_config.min_value
              ? new Date(field_config.min_value)
              : undefined
          }
          maxDate={
            field_config.max_value
              ? new Date(field_config.max_value)
              : undefined
          }
          value={value}
          onChange={(value) => onChange(value)}
          error={error}
        />
      );

    case FormFieldType.Time:
      return (
        <TimePicker
          {...commonProps}
          withDropdown
          format={
            field_config.time_format === TimeFormat.TWELVE_HOUR ? '12h' : '24h'
          }
          withSeconds={false}
          minutesStep={field_config.step || 15}
          min={field_config.min_value}
          max={field_config.max_value}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case FormFieldType.Datetime:
      return (
        <DateTimePicker
          {...commonProps}
          valueFormat={
            field_config.time_format === TimeFormat.TWELVE_HOUR
              ? 'YYYY-MM-DD hh:mm'
              : 'YYYY-MM-DD HH:mm'
          }
          minDate={
            field_config.min_value
              ? new Date(field_config.min_value)
              : undefined
          }
          maxDate={
            field_config.max_value
              ? new Date(field_config.max_value)
              : undefined
          }
          withSeconds={false}
          value={value}
          onChange={(value) => onChange(value)}
          error={error}
        />
      );

    case FormFieldType.Files:
      return (
        <FilesUploadField
          field={field}
          value={value}
          error={error}
          onChange={onChange}
        />
      );

    default:
      return (
        <Text c="dimmed" fs="italic">
          {t(' Unsupported field type: {{field_type}}', {field_type})}
        </Text>
      );
  }
};

/**
 * File upload field component with drag and drop support
 *
 * @param {Object} props
 * @param {FormField} props.field - The form field configuration
 * @param {Array} props.value - Array of uploaded file URLs
 * @param {string} props.error - Validation error message
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element}
 */
const FilesUploadField = ({field, value = [], error, onChange}) => {
  const {t} = useTranslation();
  const {uploadSizeLimit} = useUploadSizeLimit();
  const {uploadFileModel, loading, error: uploadError} = useUpload();
  const {del: deleteAttachment, loading: deleteLoading} =
    useModel('attachment');
  const {label, description, required, field_config = {}} = field;

  const maxFiles = field_config.max_files || 3;
  const maxFileSize =
    (field_config.max_file_size || uploadSizeLimit) * 1024 * 1024; // Convert MB to bytes
  const allowedTypes = field_config.allowed_file_types || 'image/*';

  /**
   * Upload files using the actual API
   * @param {File[]} files - Files to upload
   * @returns {Promise<Object>} - Returns upload response
   */
  const uploadFiles = async (files) => {
    try {
      // Use the uploadFileModel API with 'uploads' endpoint
      return await uploadFileModel('attachment', files);
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  /**
   * Handle file drop/selection
   * @param {File[]} files - Selected files
   */
  const handleFileDrop = async (files) => {
    const currentFiles = Array.isArray(value) ? value : [];

    if (currentFiles.length + files.length > maxFiles) {
      // Show error - too many files
      console.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    try {
      // Upload all files at once using the API
      const uploadResponse = await uploadFiles(files);

      // Extract file information from response
      // API returns array of file objects with id, name, etc.
      const uploadedFiles = Array.isArray(uploadResponse)
        ? uploadResponse
        : [uploadResponse];

      // Store file objects with necessary information for later use
      const fileObjects = uploadedFiles.map((file) => ({
        id: file.id,
        name: file.name,
        contentType: file.content_type,
        filesize: file.filesize,
        createdAt: file.created_at,
        // Store the complete file object for form submission
        ...file,
      }));

      const newFiles = [...currentFiles, ...fileObjects];
      onChange(newFiles);
    } catch (error) {
      console.error('File upload failed:', error);
      // Error is already handled by useUpload hook
    }
  };

  /**
   * Remove file from list and delete from server
   * @param {number} index - Index of file to remove
   */
  const handleRemoveFile = async (index) => {
    const currentFiles = Array.isArray(value) ? value : [];
    const fileToDelete = currentFiles[index];

    try {
      // If file has an ID, delete it from server
      if (fileToDelete && fileToDelete.id) {
        await deleteAttachment(fileToDelete.id);
      }

      // Remove file from local state
      const newFiles = currentFiles.filter((_, i) => i !== index);
      onChange(newFiles);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      // Still remove from UI even if server delete fails
      const newFiles = currentFiles.filter((_, i) => i !== index);
      onChange(newFiles);
    }
  };

  /**
   * Get file name from file object or URL
   * @param {Object|string} file - File object or URL
   * @returns {string} - File name
   */
  const getFileName = (file) => {
    if (typeof file === 'object' && file.name) {
      return file.name;
    }
    return typeof file === 'string'
      ? file.split('/').pop() || file
      : t('Unknown file');
  };

  const currentFiles = Array.isArray(value) ? value : [];
  const canAddMore = currentFiles.length < maxFiles;

  return (
    <Box>
      <Text size="sm" fw={500} mb="xs">
        {label}
        {required && (
          <Text component="span" c="red">
            *
          </Text>
        )}
      </Text>

      {description && (
        <Text size="xs" c="dimmed" mb="sm">
          {description}
        </Text>
      )}

      {/* File Upload Dropzone */}
      {canAddMore && (
        <Dropzone
          onDrop={handleFileDrop}
          maxSize={maxFileSize}
          accept={allowedTypes === '*' ? undefined : [allowedTypes]}
          multiple={maxFiles > 1}
          mb="sm"
          loading={loading}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
        >
          <Group gap="sm" style={{pointerEvents: 'none'}}>
            <Dropzone.Accept>
              <FontAwesomeIcon icon={faUpload} size="lg" />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <FontAwesomeIcon icon={faUpload} size="lg" />
            </Dropzone.Idle>

            <Box>
              <Text size="sm" fw={500}>
                {t('Drag files here or click to select')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('Maximum {{maxFiles}} files, {{maxSize}}MB each', {
                  maxFiles,
                  maxSize: field_config.max_file_size || uploadSizeLimit,
                })}
              </Text>
            </Box>
          </Group>
        </Dropzone>
      )}

      {/* Uploaded Files List */}
      {currentFiles.length > 0 && (
        <Stack gap="xs">
          {currentFiles.map((file, index) => (
            <Group
              key={file.id || index}
              justify="space-between"
              p="sm"
              className="border rounded"
            >
              <Group gap="sm">
                <FontAwesomeIcon icon={faFile} />
                <Box>
                  <Text size="sm" fw={500}>
                    {getFileName(file)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {file.contentType && `${file.contentType}`}
                    {file.filesize && ` • ${formatFileSize(file.filesize)}`}
                  </Text>
                </Box>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                loading={deleteLoading}
                onClick={() => handleRemoveFile(index)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </Group>
          ))}
        </Stack>
      )}

      {/* File count info */}
      <Text size="xs" c="dimmed" mt="xs">
        {t('{{current}} of {{max}} files uploaded', {
          current: currentFiles.length,
          max: maxFiles,
        })}
      </Text>

      {/* Display validation error or upload error */}
      {(error || uploadError) && (
        <Text size="sm" c="red" mt="xs">
          {error || uploadError}
        </Text>
      )}
    </Box>
  );
};

export default FieldTypeRenderer;
