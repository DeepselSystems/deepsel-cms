import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  faDownload,
  faTrash,
  faCloudArrowUp,
  faImage,
  faHardDrive,
  faCopy,
  faLink,
  faEllipsisV,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Dropzone} from '@mantine/dropzone';
import {Group, Text, Menu} from '@mantine/core';
import useModel from '../../../common/api/useModel.jsx';
import useUpload from '../../../common/api/useUpload.js';
import {
  getAttachmentUrl,
  downloadFromAttachUrl,
} from '../../../common/utils/index.js';
import Button from '../../../common/ui/Button.jsx';
import NotificationState from '../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import useAuthentication from '../../../common/api/useAuthentication.js';
import useEffectOnce from '../../../common/hooks/useEffectOnce.js';
import H1 from '../../../common/ui/H1.jsx';
import {Helmet} from 'react-helmet';

/**
 * @type {string[]}
 */
const AcceptedFormat = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/svg',
];

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFileTypeIcon(filename) {
  const extension = getFileExtension(filename);
  const supportedExtensions = [
    'doc',
    'docx',
    'pdf',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'zip',
    'rar',
    'mp4',
    'mov',
    'mkv',
    'webm',
  ];

  return supportedExtensions.includes(extension)
    ? `/images/fileTypeIcons/${extension}.png`
    : '/images/fileTypeIcons/generic.png';
}

function FileCard({file, onDelete}) {
  const {t} = useTranslation();
  const {backendHost} = BackendHostURLState((state) => state);
  const {notify} = NotificationState((state) => state);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleDownload = (e) => {
    e.stopPropagation();
    const attachUrl = getAttachmentUrl(backendHost, file.name);
    downloadFromAttachUrl(attachUrl);
  };

  const handleCopyRelativeLink = async (e) => {
    e.stopPropagation();
    const relativeUrl = `/attachment/serve/${file.name}`;
    try {
      await navigator.clipboard.writeText(relativeUrl);
      notify({
        title: t('Success'),
        message: t('Relative link copied to clipboard'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to copy relative link:', error);
      notify({
        title: t('Error'),
        message: t('Failed to copy relative link'),
        type: 'error',
      });
    }
  };

  const handleCopyAbsoluteLink = async (e) => {
    e.stopPropagation();
    const attachUrl = getAttachmentUrl(backendHost, file.name);
    try {
      await navigator.clipboard.writeText(attachUrl);
      notify({
        title: t('Success'),
        message: t('Absolute link copied to clipboard'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to copy absolute link:', error);
      notify({
        title: t('Error'),
        message: t('Failed to copy absolute link'),
        type: 'error',
      });
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(file);
  };

  const isImage = file.content_type?.startsWith('image');
  const fileSize = formatFileSize(file.filesize || 0);

  return (
    <div
      className="relative shadow border-gray-300 border rounded-lg overflow-hidden cursor-pointer"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      {isImage ? (
        <div className="relative">
          <img
            src={getAttachmentUrl(backendHost, file.name)}
            className="h-[150px] w-full object-cover"
            alt={file.name}
          />
          {showOverlay && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Button
                onClick={handleCopyRelativeLink}
                size="xs"
                variant="filled"
                className="px-2 py-1"
              >
                <FontAwesomeIcon icon={faCopy} className="mr-1 h-3 w-3" />
                {t('Copy Relative Link')}
              </Button>
              <Button
                onClick={handleCopyAbsoluteLink}
                size="xs"
                variant="filled"
                className="px-2 py-1"
              >
                <FontAwesomeIcon icon={faLink} className="mr-1 h-3 w-3" />
                {t('Copy Absolute Link')}
              </Button>
              <Menu shadow="md" width={150}>
                <Menu.Target>
                  <Button size="xs" variant="filled" className="px-2 py-1">
                    <FontAwesomeIcon icon={faEllipsisV} className="h-3 w-3" />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={
                      <FontAwesomeIcon icon={faDownload} className="h-3 w-3" />
                    }
                    onClick={handleDownload}
                  >
                    {t('Download')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    }
                    onClick={handleDelete}
                    color="red"
                  >
                    {t('Delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          )}
        </div>
      ) : (
        <div className="relative bg-gray-100">
          <div
            className="flex flex-col items-center justify-center h-[150px] p-2"
            title={file.name}
          >
            <img
              src={getFileTypeIcon(file.name)}
              alt={getFileExtension(file.name)}
              className="w-20 h-20 object-contain"
            />
          </div>
          {showOverlay && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
              <Button
                onClick={handleCopyRelativeLink}
                size="xs"
                variant="filled"
                className="px-2 py-1"
              >
                <FontAwesomeIcon icon={faCopy} className="mr-1 h-3 w-3" />
                {t('Copy Relative Link')}
              </Button>
              <Button
                onClick={handleCopyAbsoluteLink}
                size="xs"
                variant="filled"
                className="px-2 py-1"
              >
                <FontAwesomeIcon icon={faLink} className="mr-1 h-3 w-3" />
                {t('Copy Absolute Link')}
              </Button>
              <Menu shadow="md" width={150}>
                <Menu.Target>
                  <Button size="xs" variant="filled" className="px-2 py-1">
                    <FontAwesomeIcon icon={faEllipsisV} className="h-3 w-3" />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={
                      <FontAwesomeIcon icon={faDownload} className="h-3 w-3" />
                    }
                    onClick={handleDownload}
                  >
                    {t('Download')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    }
                    onClick={handleDelete}
                    color="red"
                  >
                    {t('Delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          )}
        </div>
      )}
      <div className="p-2 text-sm">
        <div className="font-medium truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-gray-500">{fileSize}</div>
      </div>
    </div>
  );
}

export default function Media() {
  const {t} = useTranslation();
  const {user} = useAuthentication();
  const {notify} = NotificationState((state) => state);
  const {backendHost} = BackendHostURLState((state) => state);

  const filters = [
    {
      field: 'owner_id',
      operator: '=',
      value: user.id,
    },
  ];

  const {
    data: files,
    setData: setFiles,
    get: getFiles,
    deleteWithConfirm,
  } = useModel('attachment', {
    pageSize: null,
    autoFetch: true,
    filters,
  });

  const {uploadFileModel} = useUpload();
  const [newUploads, setNewUploads] = useState(new Set());
  const [storageInfo, setStorageInfo] = useState({
    usedStorage: 0,
    maxStorage: null,
    unit: 'MB',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch storage information on component mount
  useEffectOnce(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${backendHost}/attachment/storage/info`);
      const data = await response.json();
      setStorageInfo({
        usedStorage: data.used_storage,
        maxStorage: data.max_storage,
        unit: data.unit,
      });
    } catch (error) {
      console.error('Error fetching storage info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatStorageInfo = () => {
    const {usedStorage, maxStorage, unit} = storageInfo;
    const formattedUsedStorage = parseFloat(usedStorage).toFixed(2);
    if (maxStorage === null) {
      return `${formattedUsedStorage} ${unit} ${t('used')}`;
    }
    const percentUsed = Math.round((usedStorage / maxStorage) * 100);
    return `${formattedUsedStorage} ${t('of')} ${maxStorage} ${unit} (${percentUsed}%)`;
  };

  const handleFileChange = async (files) => {
    try {
      // Call uploadFileModel with all files at once
      const uploadedFiles = await uploadFileModel('attachment', files);
      if (uploadedFiles) {
        // Handle single file or array of files
        const filesArray = Array.isArray(uploadedFiles)
          ? uploadedFiles
          : [uploadedFiles];

        filesArray.forEach((uploadedFile) => {
          setNewUploads((prev) => new Set([...prev, uploadedFile.id]));
          setFiles((prevFiles) => [...prevFiles, uploadedFile]);
        });

        notify({
          title: t('Success'),
          message: t('Files uploaded successfully'),
          type: 'success',
        });
      }
      // Refresh storage info after upload
      fetchStorageInfo();
    } catch (error) {
      console.error('Error uploading file:', error);
      notify({
        title: t('Error'),
        message: error.message || t('Failed to upload file'),
        type: 'error',
      });
    }
  };

  const handleDelete = async (file) => {
    try {
      // Pass file.id as an array since deleteWithConfirm expects an array of IDs
      // Use callback for success notification and state updates
      await deleteWithConfirm(
        [file.id],
        // Success callback
        () => {
          // Update newUploads set if this was a newly uploaded file
          if (newUploads.has(file.id)) {
            setNewUploads((prev) => {
              const updated = new Set(prev);
              updated.delete(file.id);
              return updated;
            });
          }

          // Update the files list by removing the deleted file
          setFiles((prevFiles) => prevFiles.filter((f) => f.id !== file.id));

          notify({
            title: t('Success'),
            message: t('File deleted successfully'),
            type: 'success',
          });

          // Refresh storage info after deletion
          fetchStorageInfo();
        },
        // Error callback
        (error) => {
          console.error('Error deleting file:', error);
          notify({
            title: t('Error'),
            message: error.message || t('Failed to delete file'),
            type: 'error',
          });
        }
      );
    } catch (error) {
      console.error('Unexpected error in handleDelete:', error);
    }
  };

  // Sort files to show new uploads first
  const sortFilesWithNewUploadsFirst = (files, newUploads) => {
    if (!files) return [];
    return [...files].sort((a, b) => {
      if (newUploads.has(a.id) && !newUploads.has(b.id)) return -1;
      if (!newUploads.has(a.id) && newUploads.has(b.id)) return 1;
      return 0;
    });
  };

  return (
    <>
      <Helmet>
        <title>{t('Media Library')}</title>
      </Helmet>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <H1>{t('Media Library')}</H1>
          <div className="flex items-center text-sm bg-gray-100 px-3 py-2 rounded-md">
            <FontAwesomeIcon
              icon={faHardDrive}
              className="mr-2 text-primary-main"
            />
            {isLoading ? t('Loading storage info...') : formatStorageInfo()}
          </div>
        </div>

        <div className="my-6">
          <Dropzone
            onDrop={handleFileChange}
            // accept={AcceptedFormat.map((format) => ({mime: format}))}
            className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
          >
            <Group
              justify="center"
              gap="xl"
              style={{minHeight: 100, pointerEvents: 'none'}}
            >
              <Dropzone.Accept>
                <FontAwesomeIcon
                  icon={faCloudArrowUp}
                  className="text-3xl text-green-500"
                />
              </Dropzone.Accept>
              <Dropzone.Idle>
                <FontAwesomeIcon
                  icon={faImage}
                  className="text-3xl text-gray-500"
                />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {sortFilesWithNewUploadsFirst(files, newUploads).map(
            (file, index) => (
              <FileCard
                key={file.id || index}
                file={file}
                onDelete={handleDelete}
              />
            )
          )}
        </div>
      </div>
    </>
  );
}
