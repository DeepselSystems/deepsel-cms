import { useTranslation } from 'react-i18next';
import {
  faUpload,
  faXmark,
  faPenToSquare,
  faCheckDouble,
  faFileLines,
  faCloudArrowUp,
  faImage,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Group, Text, Modal, Indicator } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import React, { useEffect, useRef, useState } from 'react';
import useModel from '../api/useModel.jsx';
import useUpload from '../api/useUpload.js';
import { getAttachmentUrl } from '../utils/index.js';
import Button from './Button.jsx';
import Checkbox from './Checkbox.jsx';
import NotificationState from '../stores/NotificationState.js';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import useAuthentication from '../api/useAuthentication.js';
import PropTypes from 'prop-types';
import useFetch from '../api/useFetch.js';
import FileAttachmentState from '../stores/FileAttachmentState.js';
import useEffectOnce from '../hooks/useEffectOnce.js';

/**
 * @type {string[]}
 */
const AcceptedFormat = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg'];

function FileImage({ file, onClick, isSelectMode, checked = false, isNewUpload = false }) {
  const { backendHost } = BackendHostURLState((state) => state);

  return (
    <Indicator
      disabled={!isNewUpload}
      inline
      size={15}
      radius="xl"
      color="blue"
      withBorder
      processing={false}
      position="top-end"
      zIndex={2}
    >
      <div
        onClick={onClick}
        className={`relative shadow border-gray-300 border rounded-lg overflow-hidden hover:outline cursor-pointer hover:outline-2 bg-gray-200`}
      >
        {isSelectMode && (
          <Checkbox
            className="absolute top-2 left-2 bg-white rounded-md"
            variant="outline"
            checked={checked}
            readOnly
          />
        )}

        {file.content_type?.startsWith('image') ? (
          <img
            src={getAttachmentUrl(backendHost, file.name)}
            className="h-[150px] w-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-[150px] p-2" title={file.name}>
            <FontAwesomeIcon
              icon={faFileLines}
              className={`text-[24px] sm:text-[36px] text-primary-main absolute top-2 right-2`}
            />
            <div className="mt-2 w-full text-sm bg-white rounded p-1 px-2 break-words">
              {file.name}
            </div>
          </div>
        )}
      </div>
    </Indicator>
  );
}

/**
 * @param {string }title
 * @param {Array<AttachmentFile>} files
 * @param {Set} selectedFiles
 *
 * @param {boolean} isSelectMode
 * @param {boolean} isOpenedDefault
 * @param {(file: AttachmentFile) => void} onFileClick
 *
 * @return {JSX.Element}
 * @constructor
 */
const FileAttachmentGroup = React.forwardRef(
  (
    {
      title = '',
      files = [],
      selectedFiles = new Set(),
      isSelectMode = false,
      onFileClick = () => {},
      isOpenedDefault = false,
      newUploads = new Set(),
    },
    ref,
  ) => {
    // translation
    const { t } = useTranslation();

    /**
     * @type {React.MutableRefObject<HTMLElement | null>}
     */
    const bottomEleRef = useRef();

    /**
     * handle ref
     */
    React.useImperativeHandle(ref, () => ({
      open: ({ scrollToBottom } = { scrollToBottom: false }) => {
        scrollToBottom &&
          setTimeout(
            () =>
              bottomEleRef.current?.scrollIntoView({
                behavior: 'smooth',
              }),
            100,
          );
      },
    }));

    return (
      <div>
        <div className="text-sm font-semibold w-full px-2 py-1.5 text-primary-main">
          <div className="min-w-28 text-start">{title}</div>
        </div>

        {/*region hint for empty data*/}
        {!files.length && (
          <div className="py-3 text-center text-gray-400">{t('Nothing here yet.')}</div>
        )}
        {/*endregion hint for empty data*/}

        {/*region file grid*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 my-2 mx-1">
          {files.map((file, index) => (
            <FileImage
              key={index}
              file={file}
              onClick={() => onFileClick(file)}
              isSelectMode={isSelectMode}
              checked={selectedFiles.has(file.id)}
              isNewUpload={newUploads.has(file.id)}
            />
          ))}
          <div ref={bottomEleRef} className="-translate-y-[300px]"></div>
        </div>
        {/*endregion file grid*/}
      </div>
    );
  },
);
FileAttachmentGroup.displayName = 'FileAttachmentGroup';
FileAttachmentGroup.propTypes = {
  files: PropTypes.array, // this type should be an array of AttachmentFile
  selectedFiles: PropTypes.object,
  title: PropTypes.string,
  onFileClick: PropTypes.func,
  isSelectMode: PropTypes.bool,
  isOpenedDefault: PropTypes.bool,
  newUploads: PropTypes.object,
};

export default function ChooseAttachmentModal(props) {
  const {
    isOpen,
    close,
    onChange,
    type,
    filters: initialFilters = [],
    showPastFiles = true,
    extendData = {},
    filterFunc = (attachments) => attachments,
  } = props;
  const { t } = useTranslation();
  const { user } = useAuthentication();
  const filters = [
    ...initialFilters,
    {
      field: 'owner_id',
      operator: '=',
      value: user.id,
    },
  ];

  if (type === 'image') {
    filters.push({
      field: 'content_type',
      operator: 'like',
      value: 'image%',
    });
  }

  const {
    data: files,
    setData: setFiles,
    get: getFiles,
    deleteWithConfirm,
  } = useModel('attachment', {
    pageSize: null,
    filters,
  });

  const { uploadFileModel } = useUpload();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const { notify } = NotificationState((state) => state);
  const { backendHost } = BackendHostURLState((state) => state);

  /**
   * @type {React.MutableRefObject<FileAttachmentGroupRef>}
   */
  const fileAttachmentGroupRef = React.useRef({
    open: () => {},
  });

  // choose attachment store
  const [sessionRecentFiles, setSessionRecentFiles] = React.useState(
    /** @type {Array<AttachmentFile>} */ [],
  );

  // Track new uploads since modal was opened
  const [newUploads, setNewUploads] = React.useState(new Set());

  // Initialize upload size limit functions
  const { get: getUploadSizeLimitFunc } = useFetch('attachment/config/upload_size_limit', {
    autoFetch: false,
  });
  const fetchUploadSizeLimitState = FileAttachmentState((state) => state.fetchUploadSizeLimit);
  const uploadSizeLimit = FileAttachmentState((state) => state.uploadSizeLimit);

  /**
   * Call attachment store function to fetch upload size limit state once time when initializing
   */
  useEffectOnce(() => {
    fetchUploadSizeLimitState(getUploadSizeLimitFunc);
  });

  useEffect(() => {
    if (isOpen) {
      setSessionRecentFiles([]);
      setIsSelectMode(false);
      setSelectedFiles(new Set());
      setNewUploads(new Set()); // Reset new uploads when modal opens
      if (showPastFiles) getFiles();
    }
  }, [isOpen]);

  async function handleFileChange(filesArray) {
    try {
      if (filesArray) {
        let params = '';
        if (extendData?.usedFor === 'USER_AVATAR') {
          params = new URLSearchParams({
            used_for: 'USER_AVATAR',
          }).toString();
        }
        const newFiles = await uploadFileModel(`attachment?${params}`, filesArray);
        const filesUpdated = [...files, ...newFiles];
        setFiles(filesUpdated);
        setSessionRecentFiles((prevState) => [...prevState, ...newFiles]);

        // Add new files to the newUploads set
        const newUploadsSet = new Set(newUploads);
        newFiles.forEach((file) => newUploadsSet.add(file.id));
        setNewUploads(newUploadsSet);

        fileAttachmentGroupRef.current.open({ scrollToBottom: true });
      }
    } catch (err) {
      notify({
        message: err.message,
        type: 'error',
      });
      console.error(err);
    }
  }

  function handleSelectFile(file) {
    if (onChange) {
      onChange({
        ...file,
        attachUrl: getAttachmentUrl(backendHost, file.name),
      });
    }
    close();
  }

  function handleToggleEdit() {
    setSelectedFiles(new Set());
    setIsSelectMode((state) => !state);
  }

  function handleFileClick(fileId) {
    const selectFilesClone = new Set(selectedFiles);
    if (selectFilesClone.has(fileId)) {
      selectFilesClone.delete(fileId);
    } else {
      selectFilesClone.add(fileId);
    }
    setSelectedFiles(selectFilesClone);
  }

  function isSelectAll() {
    return selectedFiles.size === files.length;
  }

  function toggleSelectAll() {
    if (isSelectAll()) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((img) => img.id)));
    }
  }

  /**
   * Sort files to show new uploads at the top of the list
   * @param {Array<AttachmentFile>} files - The files to sort
   * @param {Set<string|number>} newUploads - Set of IDs of newly uploaded files
   * @returns {Array<AttachmentFile>} - Sorted files with new uploads first
   */
  function sortFilesWithNewUploadsFirst(files, newUploads) {
    if (!files || !newUploads || newUploads.size === 0) return files;

    return [...files].sort((a, b) => {
      const aIsNew = newUploads.has(a.id);
      const bIsNew = newUploads.has(b.id);

      if (aIsNew && !bIsNew) return -1; // a is new, b is not, so a comes first
      if (!aIsNew && bIsNew) return 1; // b is new, a is not, so b comes first
      return 0; // both are new or both are old, maintain original order
    });
  }

  function handleDelete() {
    deleteWithConfirm(Array.from(selectedFiles), () => {
      setSelectedFiles(new Set());
      getFiles();
    });
  }

  return (
    <Modal
      opened={isOpen}
      onClose={close}
      title={<div className={`font-semibold text-lg`}>{t('Select attachment')}</div>}
      size="100%"
    >
      <div className="pt-4">
        {/*region files*/}
        <div className="space-y-3">
          {/* File selector removed - moved to All uploads header */}

          {/*region dropzone*/}
          <div className="mb-4">
            <Dropzone
              onDrop={handleFileChange}
              accept={
                type === 'image' ? AcceptedFormat.map((format) => ({ mime: format })) : undefined
              }
              className="border-dashed border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-main transition-colors"
            >
              <Group justify="center" gap="xl" style={{ minHeight: 100, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <FontAwesomeIcon icon={faCloudArrowUp} className="text-3xl text-green-500" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <FontAwesomeIcon icon={faXmark} className="text-3xl text-red-500" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <FontAwesomeIcon
                    icon={type === 'image' ? faImage : faUpload}
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
          {/*endregion dropzone*/}

          {/*region file grid*/}
          <div className="max-h-[500px] overflow-y-auto flex flex-col gap-2 py-1">
            {/*region display all uploads*/}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <div className="text-sm font-semibold text-primary-main mr-3">
                  {t('All uploads')}
                </div>
                {selectedFiles.size > 0 && (
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {`${selectedFiles.size} ${t('selected')}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedFiles.size > 0 && (
                  <Button
                    size="xs"
                    onClick={handleDelete}
                    color="red"
                    variant="subtle"
                    className="px-2 py-1"
                  >
                    <FontAwesomeIcon icon={faXmark} className="mr-1 h-3 w-3" />
                    {t('Delete')}
                  </Button>
                )}
                {isSelectMode && (
                  <Button
                    size="xs"
                    onClick={toggleSelectAll}
                    variant="subtle"
                    className="px-2 py-1"
                  >
                    <FontAwesomeIcon icon={faCheckDouble} className="mr-1 h-3 w-3" />
                    {isSelectAll() ? t('Deselect all') : t('Select all')}
                  </Button>
                )}
                <Button onClick={handleToggleEdit} size="xs" variant="subtle" className="px-2 py-1">
                  <FontAwesomeIcon icon={faPenToSquare} className="mr-1 h-3 w-3" />
                  {t('Toggle edit')}
                </Button>
              </div>
            </div>
            <FileAttachmentGroup
              ref={fileAttachmentGroupRef}
              isOpenedDefault
              title=""
              files={filterFunc(sortFilesWithNewUploadsFirst(files, newUploads))}
              isSelectMode={isSelectMode}
              selectedFiles={selectedFiles}
              newUploads={newUploads}
              onFileClick={(file) =>
                isSelectMode ? handleFileClick(file.id) : handleSelectFile(file)
              }
            />
            {/*endregion display all uploads*/}
          </div>
          {/*endregion file grid*/}
        </div>
        {/*endregion files*/}

        {/* Upload action removed - replaced with dropzone above */}
      </div>
    </Modal>
  );
}
