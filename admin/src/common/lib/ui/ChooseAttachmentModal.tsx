import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Indicator } from '@mantine/core';
import { useModel } from '../hooks';
import { useUpload } from '../hooks';
import { useFetch } from '../hooks';
import { useEffectOnce } from '../hooks';
import type { User } from '../types';
import type { NotifyFn } from '../types';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { useDefaultLocale } from '../../hooks/useDefaultLocale';
import { useSelectedVersion } from '../../hooks/useSelectedVersion';
import { AttachmentCardOverlay } from './AttachmentCardOverlay';
import type { OverlayAction } from './AttachmentCardOverlay';
import { AttachmentPreview } from './AttachmentPreview';
import { AttachmentDropzone } from './AttachmentDropzone';
import { IconChecks, IconEdit, IconUpload, IconX } from '@tabler/icons-react';
import { getAttachmentRelativeUrl } from '@deepsel/cms-utils';

/**
 * Accepted MIME types for image-only upload mode
 */
const AcceptedFormat: string[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg'];

/**
 * Locale metadata attached to an AttachmentLocaleVersion
 */
export interface AttachmentLocaleInfo {
  id: number;
  name: string;
  iso_code: string | null;
  emoji_flag?: string | null;
}

/**
 * A single per-locale file version under an AttachmentFile
 */
export interface AttachmentLocaleVersion {
  id: number;
  name: string;
  content_type?: string | null;
  filesize?: number | null;
  alt_text?: string | null;
  attachment_id: number;
  locale_id: number;
  locale?: AttachmentLocaleInfo | null;
  string_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  active: boolean;
  system: boolean;
}

/**
 * Represents a single file attachment record from the backend.
 * Multi-lang structure: actual files live in locale_versions[].
 */
export interface AttachmentFile {
  id: string | number;
  /** @deprecated Use locale_versions[*].name instead */
  name: string | null;
  /** @deprecated Use locale_versions[*].content_type instead */
  content_type?: string;
  locale_versions?: AttachmentLocaleVersion[];
  [key: string]: unknown;
}

/**
 * Minimal locale language shape required by VersionFlagBar
 */
interface OrgLanguage {
  id: number;
  name: string;
  iso_code?: string | null;
}

/** Ref handle exposed by FileAttachmentGroup */
interface FileAttachmentGroupRef {
  open: (options?: { scrollToBottom?: boolean }) => void;
}

// ─── FileImage ────────────────────────────────────────────────────────────────

interface FileImageProps {
  /** The attachment record to display */
  file: AttachmentFile;
  /** Called when the card is clicked in multi-select mode */
  onClick: () => void;
  /** Called when the "Select" overlay button is clicked */
  onSelectFile: (file: AttachmentFile) => void;
  /**
   * Called when the user picks a file via "Upload for {lang}" to add a locale version
   * to this existing attachment.
   */
  onUploadForLocale?: (
    attachmentId: string | number,
    localeId: number,
    file: File,
  ) => Promise<void>;
  /** Whether the parent is in multi-select mode */
  isSelectMode: boolean;
  /** Whether this file is currently selected */
  checked?: boolean;
  /** Whether this file was just uploaded in the current session */
  isNewUpload?: boolean;
  /** Site default locale ID — used to pick the initial preview version */
  defaultLocaleId: number | null;
  /** All org-configured languages — forwarded to VersionFlagBar */
  availableLanguages: OrgLanguage[];
}

/**
 * Renders a single file thumbnail inside the attachment grid.
 * On hover shows "Upload for {lang}" when no file exists for the selected locale.
 */
function FileImage({
  file,
  onClick,
  onSelectFile,
  onUploadForLocale,
  isSelectMode,
  checked = false,
  isNewUpload = false,
  defaultLocaleId,
  availableLanguages,
}: FileImageProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { selectedVersion, selectedLocaleId, setSelectedLocale } = useSelectedVersion(
    file.locale_versions ?? [],
    defaultLocaleId,
  );

  const hasVersion = selectedVersion != null;

  const selectedLangName =
    availableLanguages.find((l) => l.id === selectedLocaleId)?.name ??
    selectedVersion?.locale?.name ??
    null;

  const overlayActions: OverlayAction[] =
    !isSelectMode && !hasVersion && selectedLocaleId != null
      ? [
          {
            key: 'upload-for-lang',
            icon: IconUpload,
            label: selectedLangName
              ? t('Upload for {{lang}}', { lang: selectedLangName })
              : t('Upload'),
            onClick: (e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            },
          },
        ]
      : [];

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked || selectedLocaleId == null) return;
    e.target.value = '';
    void onUploadForLocale?.(file.id, selectedLocaleId, picked);
  }

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
        onClick={() => (isSelectMode ? onClick() : onSelectFile(file))}
        className="relative cursor-pointer"
      >
        {isSelectMode && (
          <Checkbox
            className="absolute top-2 left-2 bg-white rounded-md z-10"
            variant="outline"
            checked={checked}
            readOnly
          />
        )}

        <AttachmentPreview
          attachment={file}
          selectedLocaleId={selectedLocaleId}
          onSelectLocale={setSelectedLocale}
          defaultLocaleId={defaultLocaleId}
          availableLanguages={availableLanguages}
          overlay={
            overlayActions.length > 0 ? (
              <AttachmentCardOverlay actions={overlayActions} blurred={false} />
            ) : undefined
          }
        />
      </div>

      {/* Hidden file input triggered by "Upload for {lang}" overlay action */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
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
  /** Called when a file thumbnail is clicked in multi-select mode */
  onFileClick?: (file: AttachmentFile) => void;
  /** Called when the "Select" overlay button is clicked */
  onSelectFile?: (file: AttachmentFile) => void;
  /**
   * Called when the user picks a file via "Upload for {lang}" on a card.
   */
  onUploadForLocale?: (
    attachmentId: string | number,
    localeId: number,
    file: File,
  ) => Promise<void>;
  /** Whether the group is expanded by default */
  isOpenedDefault?: boolean;
  /** Set of IDs for files uploaded in the current session (shown with badge) */
  newUploads?: Set<string | number>;
  /** Site default locale ID forwarded to each FileImage */
  defaultLocaleId: number | null;
  /** Org-configured languages forwarded to each FileImage */
  availableLanguages: OrgLanguage[];
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
      onSelectFile = () => {},
      onUploadForLocale,
      newUploads = new Set(),
      defaultLocaleId,
      availableLanguages,
    },
    ref,
  ) => {
    const { t } = useTranslation();

    /**
     * Sentinel element at the bottom of the grid for programmatic scroll after uploads.
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

        {!files.length && (
          <div className="py-3 text-center text-gray-400">{t('Nothing here yet.')}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 my-2 mx-1">
          {files.map((file, index) => (
            <FileImage
              key={index}
              file={file}
              onClick={() => isSelectMode && onFileClick(file)}
              onSelectFile={onSelectFile}
              onUploadForLocale={onUploadForLocale}
              isSelectMode={isSelectMode}
              checked={selectedFiles.has(file.id)}
              isNewUpload={newUploads.has(file.id)}
              defaultLocaleId={defaultLocaleId}
              availableLanguages={availableLanguages}
            />
          ))}
          <div ref={bottomEleRef} className="-translate-y-[300px]"></div>
        </div>
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
   */
  backendHost: string;

  /**
   * The currently authenticated user.
   */
  user: User;

  /**
   * Setter for the user state — used by underlying hooks to clear session on 401.
   */
  setUser: (user: User | null) => void;

  /**
   * Callback to display toast/snackbar notifications.
   */
  notify?: NotifyFn;

  /**
   * Current upload size limit fetched from the backend.
   */
  uploadSizeLimit?: { max_size: number; unit: string } | null;

  /**
   * Callback to trigger fetching the upload size limit from the backend.
   */
  onFetchUploadSizeLimit?: (apiFunc: () => Promise<{ max_size: number; unit: string }>) => void;
}

/**
 * Modal for browsing, uploading, and selecting file attachments.
 *
 * Dropzone behavior: uploads with the site default locale, then auto-selects
 * the uploaded file and closes the modal.
 *
 * Card hover behavior:
 * - If the currently selected locale has a file → "Select" button
 * - If no file for the selected locale → "Upload for {lang}" button which adds a locale
 *   version to the existing attachment, then auto-selects and closes.
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
  const { defaultLocaleId, availableLanguages } = useDefaultLocale();

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
      field: 'locale_versions.content_type',
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

  const [, setSessionRecentFiles] = React.useState<AttachmentFile[]>([]);

  /** Set of file IDs uploaded in the current session — shown with a badge indicator */
  const [newUploads, setNewUploads] = React.useState<Set<string | number>>(new Set());

  const { get: getUploadSizeLimitFunc } = useFetch(
    'attachment/config/upload_size_limit',
    { backendHost, setUser },
    { autoFetch: false },
  );

  const { post: batchUpsert } = useFetch(
    'attachment',
    { backendHost, setUser },
    { autoFetch: false },
  );

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
      setNewUploads(new Set());
      if (showPastFiles) void getFiles();
    }
  }, [isOpen]);

  /**
   * Builds the URL query string for uploads, applying any extendData params.
   */
  function buildUploadParams(localeId?: number | null): string {
    const params = new URLSearchParams();
    if (extendData?.usedFor === 'USER_AVATAR') {
      params.set('used_for', 'USER_AVATAR');
    }
    if (localeId != null) {
      params.set('locale_id', String(localeId));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  /**
   * Handles dropzone file drop: uploads with site default locale, appends results
   * to the grid, and scrolls to the new entries. Modal stays open.
   */
  async function handleFileChange(filesArray: File[]) {
    try {
      if (!filesArray.length) return;
      const qs = buildUploadParams(defaultLocaleId);
      const newFiles = (await uploadFileModel(`attachment${qs}`, filesArray)) as AttachmentFile[];

      setFiles([...files, ...newFiles] as AttachmentFile[]);
      setSessionRecentFiles((prev) => [...prev, ...newFiles]);

      const newUploadsSet = new Set(newUploads);
      newFiles.forEach((f) => newUploadsSet.add(f.id));
      setNewUploads(newUploadsSet);

      fileAttachmentGroupRef.current.open({ scrollToBottom: true });
    } catch (err) {
      notify?.({
        message: (err as Error).message,
        type: 'error',
      });
      console.error(err);
    }
  }

  /**
   * Uploads a new locale version for an existing attachment, then auto-selects
   * the attachment and closes the modal.
   *
   * Uses the batch_upsert endpoint:
   *   POST /attachment/{attachmentId}/locale_versions/batch_upsert
   *
   * The file is sent as multipart with a fixed _file_id = "upload" so the
   * backend can match the item to the file by stripping the extension.
   */
  async function handleUploadForLocale(
    attachmentId: string | number,
    localeId: number,
    file: File,
  ) {
    try {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()! : '';
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      /** Renamed so the backend file_map key matches _file_id = "upload" */
      const renamedFile = new File([file], `upload${ext}`, { type: file.type });

      const items = JSON.stringify([
        {
          locale_id: localeId,
          attachment_locale_version_id: null,
          _file_id: 'upload',
          name: baseName,
        },
      ]);

      const formData = new FormData();
      formData.append('items_json', items);
      formData.append('files', renamedFile);

      await batchUpsert(formData, {
        path: `attachment/${attachmentId}/locale_versions/batch_upsert`,
      });

      void getFiles();
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
      const defaultVersion =
        file.locale_versions?.find((v) => v.locale_id === defaultLocaleId) ??
        file.locale_versions?.[0];
      onChange({
        ...file,
        attachUrl: defaultVersion
          ? getAttachmentRelativeUrl(defaultVersion.name)
          : getAttachmentRelativeUrl(file.name ?? ''),
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
      title={<div className="font-semibold text-lg">{t('Select attachment')}</div>}
      size="100%"
      zIndex={11000}
    >
      <div className="pt-4">
        <div className="space-y-3">
          {/*region dropzone*/}
          <div className="mb-4">
            <AttachmentDropzone
              onDrop={(droppedFiles) => void handleFileChange(droppedFiles)}
              accept={type === 'image' ? AcceptedFormat : undefined}
              imageMode={type === 'image'}
            />
          </div>
          {/*endregion dropzone*/}

          {/*region file grid*/}
          <div className="max-h-[500px] overflow-y-auto flex flex-col gap-2 py-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <div className="text-sm font-semibold text-primary-main mr-3">
                  {t('All uploads')}
                </div>
                {selectedFiles.size > 0 && (
                  <span className="text-xs text-gray-500 mr-2">
                    {`${selectedFiles.size} ${t('selected')}`}
                  </span>
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
                    <IconX size={18} className="mr-1" />
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
                    <IconChecks size={18} className="mr-1" />
                    {isSelectAll() ? t('Deselect all') : t('Select all')}
                  </Button>
                )}
                <Button onClick={handleToggleEdit} size="xs" variant="subtle" className="px-2 py-1">
                  <IconEdit size={18} className="mr-1" />
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
              onFileClick={(file) => handleFileClick(file.id)}
              onSelectFile={handleSelectFile}
              onUploadForLocale={handleUploadForLocale}
              defaultLocaleId={defaultLocaleId}
              availableLanguages={availableLanguages}
            />
          </div>
          {/*endregion file grid*/}
        </div>
      </div>
    </Modal>
  );
}
