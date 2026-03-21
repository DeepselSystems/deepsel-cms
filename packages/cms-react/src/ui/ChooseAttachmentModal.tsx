import React, { useEffect, useRef, useState } from 'react';
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
import { getAttachmentUrl } from '@deepsel/cms-utils';
import { useModel } from '../hooks';
import { useUpload } from '../hooks';
import { useFetch } from '../hooks';
import { useEffectOnce } from '../hooks';
import type { User } from '../types';
import type { NotifyFn } from '../types';
import { Button } from './Button';
import { Checkbox } from './Checkbox';

/**
 * Accepted MIME types for image-only upload mode
 */
const AcceptedFormat: string[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg'];

/**
 * Represents a single file attachment record from the backend
 */
export interface AttachmentFile {
  id: string | number;
  name: string;
  content_type?: string;
  [key: string]: unknown;
}

/** Ref handle exposed by FileAttachmentGroup */
interface FileAttachmentGroupRef {
  open: (options?: { scrollToBottom?: boolean }) => void;
}

// ─── FileImage ────────────────────────────────────────────────────────────────

interface FileImageProps {
  /** The attachment record to display */
  file: AttachmentFile;
  /** Click handler (select or toggle) */
  onClick: () => void;
  /** Whether the parent is in multi-select mode */
  isSelectMode: boolean;
  /** Whether this file is currently selected */
  checked?: boolean;
  /** Whether this file was just uploaded in the current session */
  isNewUpload?: boolean;
  /** Backend host URL used to build the attachment preview URL */
  backendHost: string;
}

/**
 * Renders a single file thumbnail inside the attachment grid.
 * Images are displayed as a cover photo; other files show a file icon.
 */
function FileImage({
  file,
  onClick,
  isSelectMode,
  checked = false,
  isNewUpload = false,
  backendHost,
}: FileImageProps) {
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
            alt={file.name || ''}
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

// ─── FileAttachmentGroup ──────────────────────────────────────────────────────

interface FileAttachmentGroupProps {
  /** Section header label */
  title?: string;
  /** List of attachment records to display */
  files?: AttachmentFile[];
  /** Set of selected file IDs */
  selectedFiles?: Set<string | number>;
  /** Whether multi-select mode is active */
  isSelectMode?: boolean;
  /** Called when a file thumbnail is clicked */
  onFileClick?: (file: AttachmentFile) => void;
  /** Whether the group is expanded by default (unused in current layout but kept for API compat) */
  isOpenedDefault?: boolean;
  /** Set of IDs for files uploaded in the current session (shown with badge) */
  newUploads?: Set<string | number>;
  /** Backend host URL passed through to each FileImage */
  backendHost: string;
}

/**
 * Renders a labelled grid of file thumbnails with optional multi-select support.
 * Exposes an imperative `open()` handle via ref to trigger scroll-to-bottom.
 */
const FileAttachmentGroup = React.forwardRef<FileAttachmentGroupRef, FileAttachmentGroupProps>(
  (
    {
      title = '',
      files = [],
      selectedFiles = new Set(),
      isSelectMode = false,
      onFileClick = () => {},
      newUploads = new Set(),
      backendHost,
    },
    ref,
  ) => {
    const { t } = useTranslation();

    /**
     * Reference to the invisible sentinel element at the bottom of the grid,
     * used for programmatic smooth-scroll after uploads.
     */
    const bottomEleRef = useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
      open: ({ scrollToBottom } = { scrollToBottom: false }) => {
        if (scrollToBottom) {
          setTimeout(
            () =>
              bottomEleRef.current?.scrollIntoView({
                behavior: 'smooth',
              }),
            100,
          );
        }
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
              backendHost={backendHost}
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

// ─── ChooseAttachmentModal ────────────────────────────────────────────────────

/** Optional filter added to the model query */
interface AttachmentFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface ChooseAttachmentModalProps {
  /**
   * Controls whether the modal is visible.
   */
  isOpen: boolean;

  /**
   * Callback to close the modal.
   */
  close: () => void;

  /**
   * Called when the user selects a file.
   * Receives the attachment record enriched with `attachUrl`.
   */
  onChange?: (file: AttachmentFile & { attachUrl: string }) => void;

  /**
   * When set to `'image'`, restricts upload and listing to image MIME types.
   */
  type?: string;

  /**
   * Additional backend query filters applied when listing attachments.
   * An `owner_id` filter is always appended automatically.
   */
  filters?: AttachmentFilter[];

  /**
   * When `false`, the existing attachment list is not fetched on open.
   * Defaults to `true`.
   */
  showPastFiles?: boolean;

  /**
   * Extra data passed to the upload endpoint (e.g. `{ usedFor: 'USER_AVATAR' }`).
   */
  extendData?: { usedFor?: string; [key: string]: unknown };

  /**
   * Optional function to post-filter the displayed attachments client-side.
   * Defaults to identity (show all).
   */
  filterFunc?: (attachments: AttachmentFile[]) => AttachmentFile[];

  /**
   * Backend host URL (e.g. `https://api.example.com`).
   * Used to build attachment preview URLs and API request base paths.
   * Typically sourced from your `BackendHostURLState` store.
   */
  backendHost: string;

  /**
   * The currently authenticated user.
   * Used to scope attachments to the current owner and to authorize API requests.
   * Typically sourced from your `UserState` store.
   */
  user: User;

  /**
   * Setter for the user state — used by underlying hooks to clear session on 401.
   * Typically sourced from your `UserState` store.
   */
  setUser: (user: User | null) => void;

  /**
   * Callback to display toast/snackbar notifications (upload errors, etc.).
   * Sourced from the consuming app's notification store
   * (e.g. `NotificationState.getState().notify`).
   */
  notify?: NotifyFn;

  /**
   * Current upload size limit fetched from the backend.
   * Sourced from the consuming app's FileAttachmentState store.
   * Used downstream for file-size validation.
   */
  uploadSizeLimit?: { max_size: number; unit: string } | null;

  /**
   * Callback to trigger fetching the upload size limit from the backend.
   * Sourced from the consuming app's FileAttachmentState store.
   * The store debounces and caches this call to avoid duplicate requests.
   */
  onFetchUploadSizeLimit?: (apiFunc: () => Promise<{ max_size: number; unit: string }>) => void;
}

/**
 * Modal for browsing, uploading, and selecting file attachments.
 *
 * Requires `backendHost`, `user`, and `setUser` to be passed as props
 * (sourced from your BackendHostURLState / UserState stores in the consuming app).
 */
export function ChooseAttachmentModal(props: ChooseAttachmentModalProps) {
  const {
    isOpen,
    close,
    onChange,
    type,
    filters: initialFilters = [],
    showPastFiles = true,
    extendData = {},
    filterFunc = (attachments) => attachments,
    backendHost,
    user,
    setUser,
    notify,
    onFetchUploadSizeLimit,
  } = props;

  const { t } = useTranslation();

  const filters: AttachmentFilter[] = [
    ...initialFilters,
    {
      field: 'owner_id',
      operator: '=',
      value: user?.id,
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
  } = useModel('attachment', { backendHost, user, setUser }, { pageSize: null, filters });

  const { uploadFileModel } = useUpload({ backendHost, token: user?.token });

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string | number>>(new Set());

  /**
   * Ref to the FileAttachmentGroup, used to trigger smooth scroll-to-bottom after upload.
   */
  const fileAttachmentGroupRef = React.useRef<FileAttachmentGroupRef>({
    open: () => {},
  });

  /** Track session recent files (setter used to append new uploads; reader unused in JSX) */
  const [, setSessionRecentFiles] = React.useState<AttachmentFile[]>([]);

  /** Set of file IDs uploaded in the current session — shown with a badge indicator */
  const [newUploads, setNewUploads] = React.useState<Set<string | number>>(new Set());

  // Initialize upload size limit functions
  const { get: getUploadSizeLimitFunc } = useFetch(
    'attachment/config/upload_size_limit',
    { backendHost, setUser },
    { autoFetch: false },
  );

  /**
   * Fetch the upload size limit once on mount via the consuming app's
   * onFetchUploadSizeLimit callback (sourced from FileAttachmentState).
   * The store debounces and caches the result internally.
   */
  useEffectOnce(() => {
    if (onFetchUploadSizeLimit) {
      onFetchUploadSizeLimit(
        getUploadSizeLimitFunc as () => Promise<{ max_size: number; unit: string }>,
      );
    }
  });

  useEffect(() => {
    if (isOpen) {
      setSessionRecentFiles([]);
      setIsSelectMode(false);
      setSelectedFiles(new Set());
      setNewUploads(new Set()); // Reset new uploads when modal opens
      if (showPastFiles) void getFiles();
    }
  }, [isOpen]);

  async function handleFileChange(filesArray: File[]) {
    try {
      if (filesArray) {
        let params = '';
        if (extendData?.usedFor === 'USER_AVATAR') {
          params = new URLSearchParams({
            used_for: 'USER_AVATAR',
          }).toString();
        }
        const newFiles = (await uploadFileModel(
          `attachment?${params}`,
          filesArray,
        )) as AttachmentFile[];
        const filesUpdated = [...files, ...newFiles];
        setFiles(filesUpdated as AttachmentFile[]);
        setSessionRecentFiles((prevState) => [...prevState, ...newFiles]);

        // Add new files to the newUploads set
        const newUploadsSet = new Set(newUploads);
        newFiles.forEach((file) => newUploadsSet.add(file.id));
        setNewUploads(newUploadsSet);

        fileAttachmentGroupRef.current.open({ scrollToBottom: true });
      }
    } catch (err) {
      notify?.({
        message: (err as Error).message,
        type: 'error',
      });
      console.error(err);
    }
  }

  function handleSelectFile(file: AttachmentFile) {
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

  function handleFileClick(fileId: string | number) {
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
      setSelectedFiles(new Set(files.map((img) => (img as AttachmentFile).id)));
    }
  }

  /**
   * Sort files to show new uploads at the top of the list
   */
  function sortFilesWithNewUploadsFirst(
    fileList: AttachmentFile[],
    uploads: Set<string | number>,
  ): AttachmentFile[] {
    if (!fileList || !uploads || uploads.size === 0) return fileList;

    return [...fileList].sort((a, b) => {
      const aIsNew = uploads.has(a.id);
      const bIsNew = uploads.has(b.id);

      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      return 0;
    });
  }

  function handleDelete() {
    void deleteWithConfirm(Array.from(selectedFiles), () => {
      setSelectedFiles(new Set());
      void getFiles();
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
          {/*region dropzone*/}
          <div className="mb-4">
            <Dropzone
              onDrop={(files) => {
                void handleFileChange(files);
              }}
              accept={type === 'image' ? AcceptedFormat : undefined}
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
                  <Text size="sm" inline mt={7}>
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
              files={filterFunc(
                sortFilesWithNewUploadsFirst(files as AttachmentFile[], newUploads),
              )}
              isSelectMode={isSelectMode}
              selectedFiles={selectedFiles}
              newUploads={newUploads}
              onFileClick={(file) =>
                isSelectMode ? handleFileClick(file.id) : handleSelectFile(file)
              }
              backendHost={backendHost}
            />
            {/*endregion display all uploads*/}
          </div>
          {/*endregion file grid*/}
        </div>
        {/*endregion files*/}
      </div>
    </Modal>
  );
}
