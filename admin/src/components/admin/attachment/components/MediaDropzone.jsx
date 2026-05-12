import { useTranslation } from 'react-i18next';
import { Dropzone } from '@mantine/dropzone';
import { Group, Text } from '@mantine/core';
import { IconCloudUpload, IconPhoto } from '@tabler/icons-react';
import useUpload from '../../../../common/api/useUpload.js';
import NotificationState from '../../../../common/stores/NotificationState.js';

/**
 * Dropzone upload area for the Media Library.
 * Handles file selection, upload, and notifies parent of results.
 *
 * @param {object} props
 * @param {(files: object[]) => void} props.onFilesUploaded - Called with uploaded file objects on success
 * @param {() => void} [props.onStorageChange] - Called after upload to trigger storage info refresh
 */
export function MediaDropzone({ onFilesUploaded, onStorageChange }) {
  const { t } = useTranslation();
  const { notify } = NotificationState((state) => state);
  const { uploadFileModel } = useUpload();

  /**
   * Handles file drop event and uploads files to the server.
   * @param {FileList} files - The files to upload.
   */
  const handleDrop = async (files) => {
    try {
      const uploadedFiles = await uploadFileModel('attachment', files);
      if (uploadedFiles) {
        const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
        onFilesUploaded(filesArray);
        notify({
          title: t('Success'),
          message: t('Files uploaded successfully'),
          type: 'success',
        });
      }
      onStorageChange?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      notify({
        title: t('Error'),
        message: error.message || t('Failed to upload file'),
        type: 'error',
      });
    }
  };

  return (
    <div className="my-6">
      <Dropzone
        onDrop={handleDrop}
        className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
      >
        <Group justify="center" gap="xl" className="min-h-24 pointer-events-none">
          <Dropzone.Accept>
            <IconCloudUpload size={16} className="text-3xl text-green-500" />
          </Dropzone.Accept>
          <Dropzone.Idle>
            <IconPhoto size={16} className="text-3xl text-gray-500" />
          </Dropzone.Idle>

          <div className="text-center">
            <Text size="xl" inline className="font-medium">
              {t('Drag files here or click to select files')}
            </Text>
            <Text size="sm" color="dimmed" inline mt={7}>
              {t('Upload as many files as you need')}
            </Text>
          </div>
        </Group>
      </Dropzone>
    </div>
  );
}
